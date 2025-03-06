import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.entry";
import React, { useState, useEffect } from "react";
import { Modal, Button, Table } from "react-bootstrap";
import { fetchAllTemplates, fetchTemplateById, deleteTemplate } from "../api";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const TemplateManagerModal = ({ show, onHide, onLoadTemplate }) => {
  const [templates, setTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (show) fetchTemplates();
  }, [show]);

  const fetchTemplates = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetchAllTemplates();
      const groupedTemplates = groupTemplatesByName(response.data);
      setTemplates(groupedTemplates);
    } catch (err) {
      console.error("Error fetching templates:", err.message);
      setError("Failed to fetch templates. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };


  const groupTemplatesByName = (templates) => {
    const grouped = templates.reduce((acc, template) => {
      const { templateName = "Unnamed Template" } = template;
      if (!acc[templateName]) acc[templateName] = [];
      acc[templateName].push(template);
      return acc;
    }, {});

    return Object.entries(grouped).map(([name, versions]) => ({
      name,
      versions: versions.sort((a, b) => b.version - a.version),
    }));
  };

  const handleDeleteTemplate = async (templateId) => {
    if (!window.confirm("Are you sure you want to delete this template?")) return;

    setIsLoading(true);
    setError(null);
    try {
      await deleteTemplate(templateId);
      await fetchTemplates();
      alert("Template deleted successfully!");
    } catch (err) {
      console.error("Error deleting template:", err.message);
      setError("Failed to delete template. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const normalizeTaggingInformation = (taggingInformation) => {
    if (!Array.isArray(taggingInformation)) {
      console.error("Expected taggingInformation to be an array, received:", taggingInformation);
      return [];
    }
  
    return taggingInformation.flatMap((item, index) => {
      if (
        typeof item === "object" &&
        item !== null &&
        "type" in item &&
        "name" in item &&
        "x" in item &&
        "y" in item &&
        "width" in item &&
        "height" in item &&
        "page" in item &&
        "id" in item
      ) {
        return item; // Valid item
      }
  
      console.warn(`Excluding invalid taggingInformation item at index ${index}:`, item);
      return []; // Exclude invalid items
    });
  };
  
  const loadPdfFromBase64 = async (pdfBlob) => {
    try {
      const pdfBuffer = Uint8Array.from(atob(pdfBlob), (char) => char.charCodeAt(0));
      return await pdfjsLib.getDocument({ data: pdfBuffer }).promise;
    } catch (err) {
      console.error("Error loading PDF:", err.message);
      throw new Error("Invalid PDF structure.");
    }
  };

  const handleLoadTemplate = async (templateId) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetchTemplateById(templateId);
      let { jsonData, pdfBlob } = response.data;

      if (typeof jsonData === "string") {
        jsonData = JSON.parse(jsonData);
      }

      jsonData.taggingInformation = normalizeTaggingInformation(jsonData.taggingInformation);

      const pdfDoc = await loadPdfFromBase64(pdfBlob);

      if (typeof onLoadTemplate === "function") {
        onLoadTemplate({ jsonData, pdfDoc });
      } else {
        console.error("onLoadTemplate is not a valid function:", onLoadTemplate);
      }
    } catch (err) {
      console.error("Error loading template:", err.message);
      setError(`Failed to load the template: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton={!isLoading}>
        <Modal.Title>Manage Templates</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {isLoading ? (
          <div className="d-flex justify-content-center">
            <div className="spinner-border" role="status">
              <span className="sr-only">Loading...</span>
            </div>
          </div>
        ) : error ? (
          <div className="alert alert-danger">
            {error}{" "}
            <Button
              variant="outline-light"
              size="sm"
              onClick={fetchTemplates}
            >
              Retry
            </Button>
          </div>
        ) : templates.length === 0 ? (
          <p className="text-muted">No templates available.</p>
        ) : (
          <Table striped bordered hover>
            <thead>
              <tr>
                <th>Template Name</th>
                <th>Version</th>
                <th>Latest</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {templates.map(({ name, versions }) =>
                versions.map((template, index) => (
                  <tr key={template.id}>
                    {index === 0 && <td rowSpan={versions.length}>{name}</td>}
                    <td>v{template.version}</td>
                    <td>
                      {template.latest ? (
                        <i className="text-success fas fa-check" />
                      ) : (
                        <i className="text-muted fas fa-minus" />
                      )}
                    </td>
                    <td>
                      <Button
                        variant="primary"
                        size="sm"
                        className="mr-2"
                        disabled={isLoading}
                        onClick={() => handleLoadTemplate(template.id)}
                      >
                        Load
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        disabled={isLoading}
                        onClick={() => handleDeleteTemplate(template.id)}
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide} disabled={isLoading}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default TemplateManagerModal;
