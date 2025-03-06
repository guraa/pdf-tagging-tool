import React, { useState, useEffect, useRef } from "react";
import { fetchAllTemplates, fetchTemplateById, saveTemplate } from "./api";
import { stringify } from "flatted";
import TemplateManagerModal from "./Modals/TemplateManagerModal";
import CanvasDisplay from "./CanvasDisplay";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.entry";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const Templates = ({
  onLoadTemplate,
  templateName,
  fileInputRef,
  setTemplateName,
  setTaggedElements,
  taggedElements
}) => {
  const [templates, setTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [pdfDoc, setPdfDoc] = useState(null); // Define pdfDoc state
  const [currentPage, setCurrentPage] = useState(0);
  const [isEditing, setIsEditing] = useState(false); // State for editing template name
  const canvasRef = useRef(null);

  useEffect(() => {
    const fetchTemplates = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetchAllTemplates();
        setTemplates(response.data || []);
      } catch (error) {
        console.error("Error fetching templates:", error.message);
        setError("Failed to fetch templates.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchTemplates();
  }, []);

  /*
  const handleTemplateLoad = ({ jsonData, pdfDoc }) => {
    console.log("Template loaded with:", { jsonData, pdfDoc });

    // Use the state updater to update taggedElements
    setTaggedElements(jsonData.taggingInformation);
    console.log("Updated taggedElements:", jsonData.taggingInformation);

    // Update the PDF document state
    setPdfDoc(pdfDoc);
    console.log("Updated pdfDoc");

    // Update the template name state
    setTemplateName(jsonData.templateName);
    console.log("Updated templateName:", jsonData.templateName);
  };
*/
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage); // Update page when required
  };

  const convertToBase64 = (buffer) =>
    new Promise((resolve, reject) => {
      const blob = new Blob([buffer]);
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result.split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

  const handleSaveTemplate = async () => {
    if (!templateName) {
      alert("Please provide a template name.");
      return;
    }

    const pdfFile = fileInputRef.current?.files?.[0];


    console.log("setTaggedElements: " + JSON.stringify(taggedElements))

    if (!taggedElements || taggedElements.length === 0) {
      console.warn("No tagging information available to save.");
      alert("No tags found. Please add tags before saving.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const pdfBuffer = await pdfFile.arrayBuffer();
      const pdfBase64 = await convertToBase64(pdfBuffer);

      const cleanTaggedElements = taggedElements.map((element) => ({
        ...element,
        children: element.children
          ? element.children.map((child) => ({
              ...child,
              children: child.children ? [...child.children] : [],
            }))
          : [],
      }));

      const requestBody = {
        name: templateName,
        jsonData: JSON.stringify({
          templateName,
          taggingInformation: taggedElements.map((element) =>
            element.type === "table"
              ? { ...element, metadata: element.metadata || {} }
              : element
          ),
        }),
        pdfBlob: pdfBase64,
      };

      console.log("Sending request body:", requestBody);

      await saveTemplate(requestBody);

      alert("Template saved successfully!");
      const response = await fetchAllTemplates();
      setTemplates(response.data || []);
    } catch (error) {
      console.error("Error saving template:", error.message);
      setError("Failed to save template.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="form-group bg-white p-3 rounded shadow mb-4">
      <h5 className="font-weight-bold text-secondary mb-3">
        <i className="fas fa-folder mr-2"></i>{" "}
        {pdfDoc ? "PDF Viewer" : "Manage Templates"}
      </h5>

      {/* Shared Container for Manage Templates or PDF */}
      <div className="content-container">
        {!pdfDoc ? (
          <>
            {/* Manage Templates Section */}
            <div className="form-group bg-white p-3 rounded shadow mb-4">
              <h5 className="font-weight-bold text-secondary mb-3">
                <i className="fas fa-file-signature mr-2"></i> Template Name
              </h5>
              {!isEditing ? (
                <div className="d-flex justify-content-between align-items-center">
                  <span className="text-dark font-weight-bold">
                    {templateName || "No template name set"}
                  </span>
                  <button
                    className="btn btn-sm btn-secondary"
                    onClick={() => setIsEditing(true)}
                  >
                    Edit
                  </button>
                </div>
              ) : (
                <div className="d-flex">
                  <input
                    type="text"
                    className="form-control mr-2"
                    placeholder="Enter template name"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                  />
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={() => setIsEditing(false)}
                  >
                    Save
                  </button>
                </div>
              )}
            </div>

            <div className="mb-3">
              <button
                className="btn btn-success btn-sm w-100"
                onClick={handleSaveTemplate}
                disabled={isLoading}
              >
                {isLoading ? "Saving..." : "Save Current Template"}
              </button>
            </div>

            <div className="mb-3">
              <button
                className="btn btn-primary btn-sm w-100"
                onClick={() => setShowTemplateModal(true)}
              >
                Manage Templates
              </button>
            </div>

            {/* Template Manager Modal */}
            <TemplateManagerModal
              show={showTemplateModal}
              onHide={() => setShowTemplateModal(false)}
              onLoadTemplate={onLoadTemplate}
              templates={templates}
              setTemplates={setTemplates}
            />
          </>
        ) : (
          <>
           {/*
              <CanvasDisplay
                canvasRef={canvasRef}
                currentPage={currentPage}
                pdfDoc={pdfDoc}
                taggedElements={taggedElements}
                setTaggedElements={setTaggedElements}
              />
              */}
          </>
        )}
      </div>
    </div>
  );
};

export default Templates;
