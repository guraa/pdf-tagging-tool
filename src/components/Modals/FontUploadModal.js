import React, { useState } from "react";
import { Modal, Button, Form } from "react-bootstrap";

const FontUploadModal = ({
  show,
  handleClose,
  uploadedFonts,
  setUploadedFonts,
}) => {
  const [selectedFontFile, setSelectedFontFile] = useState(null);

  const handleFontFileChange = (e) => {
    const file = e.target.files[0];
    setSelectedFontFile(file);
  };

  const handleFontUpload = () => {
    if (!selectedFontFile) {
      alert("Please select a font file to upload.");
      return;
    }

    const reader = new FileReader();
    reader.onload = function (event) {
      const base64Font = event.target.result.split(",")[1];
      const newFont = { name: selectedFontFile.name, base64: base64Font };
      setUploadedFonts((prevFonts) => [...prevFonts, newFont]);
    };
    reader.readAsDataURL(selectedFontFile);
    setSelectedFontFile(null);
    handleClose();
  };

  return (
    <Modal show={show} onHide={handleClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>Upload Fonts</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          <Form.Group>
            <Form.Label>Select Font File</Form.Label>
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
        <Button variant="secondary" onClick={handleClose}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleFontUpload} disabled={!selectedFontFile}>
          Upload
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default FontUploadModal;
