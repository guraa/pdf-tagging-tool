import React, { useState, useRef } from "react";
import { Modal, Button, Form } from "react-bootstrap";

const NewTemplateModal = ({ show, onHide, onSave,fileInputRef  }) => {
  const [templateName, setTemplateName] = useState("");
  const [pdfFile, setPdfFile] = useState(null);
  const [fonts, setFonts] = useState([]);

  const templateNameRef = useRef("");

  const handleSave = () => {
    if (!templateNameRef.current.value) {
      alert("Please enter a template name.");
      return;
    }

    if (!fileInputRef.current || !fileInputRef.current.files?.length) {
      alert("Please upload a PDF.");
      return;
    }
  
    onSave({
      templateName: templateNameRef.current.value,
      pdfFile: fileInputRef.current.files[0],
      fonts,
    });
  
    console.log("File uploaded:", fileInputRef.current.files[0]);
    onHide();
  };

  const handleFontUpload = (e) => {
    const uploadedFonts = Array.from(e.target.files).filter((file) => {
      const validExtensions = [".ttf", ".otf", ".woff"];
      const fileExtension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
      return validExtensions.includes(fileExtension);
    }).map((file) => ({
      name: file.name,
      file,
    }));
  
    setFonts((prevFonts) => [...prevFonts, ...uploadedFonts]);
  };

  return (
    <Modal show={show} onHide={onHide} size="md" centered>
      <Modal.Header closeButton>
        <Modal.Title>Create New Template</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          {/* Template Name */}
          <Form.Group controlId="templateName">
            <Form.Label>Template Name</Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter template name"
              ref={templateNameRef}
            />
          </Form.Group>

          {/* PDF Upload */}
          <Form.Group controlId="pdfFile">
            <Form.Label>Upload PDF</Form.Label>
            <Form.Control
              type="file"
              accept="application/pdf"
              ref={fileInputRef}
            />
          </Form.Group>

          {/* Font Upload */}
          <Form.Group controlId="fontFiles">
            <Form.Label>Upload Fonts (Optional)</Form.Label>
            <Form.Control
              type="file"
              accept=".ttf,.otf,.woff"
              multiple
              onChange={handleFontUpload}
            />
            <ul className="mt-2">
  {fonts.map((font, index) => (
    <li key={index}>
      {font.name}
      <Button
        variant="link"
        size="sm"
        onClick={() =>
          setFonts((prevFonts) =>
            prevFonts.filter((_, i) => i !== index)
          )
        }
      >
        Remove
      </Button>
    </li>
  ))}
</ul>
          </Form.Group>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSave}>
          Save
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default NewTemplateModal;
