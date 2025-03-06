import React, { useState } from "react";
import { Button, Form, Modal } from "react-bootstrap";

const FontManager = ({ uploadedFonts, onUploadFont }) => {
  const [showModal, setShowModal] = useState(false);
  const [selectedFontFile, setSelectedFontFile] = useState(null);

  const handleFontFileChange = (e) => {
    setSelectedFontFile(e.target.files[0]);
  };

  const handleFontUpload = () => {
    if (!selectedFontFile) {
      alert("Please select a font file first.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Font = event.target.result.split(",")[1]; // Extract base64
      const newFont = { name: selectedFontFile.name, base64: base64Font };
      onUploadFont(newFont); // Pass the uploaded font back to the parent
      setSelectedFontFile(null);
      setShowModal(false);
    };
    reader.readAsDataURL(selectedFontFile);
  };

  return (
    <>
      <Button onClick={() => setShowModal(true)} className="mb-3">
        Upload Fonts
      </Button>

      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Upload Fonts</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group>
              <Form.Control
                type="file"
                accept=".ttf,.otf,.woff"
                onChange={handleFontFileChange}
              />
            </Form.Group>
            <ul className="mt-3">
              {uploadedFonts.map((font, index) => (
                <li key={index}>{font.name}</li>
              ))}
            </ul>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={handleFontUpload}>
            Upload
          </Button>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default FontManager;
