import React, { useState } from "react";
import axios from "axios";

const TemplateForm = () => {
  const [name, setName] = useState("");
  const [jsonData, setJsonData] = useState("");
  const [pdfFile, setPdfFile] = useState(null);

  const handleSubmit = async () => {
    if (!name || !jsonData || !pdfFile) {
      alert("All fields are required!");
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Pdf = reader.result.split(",")[1]; // Extract Base64 content
      const template = { name, jsonData, pdfBlob: base64Pdf };

      try {
        await axios.post("http://localhost:8080/api/templates", template);
        alert("Template saved successfully!");
      } catch (error) {
        console.error("Error saving template:", error.response?.data || error.message);
        alert("Failed to save template.");
      }
    };
    reader.readAsDataURL(pdfFile);
  };

  return (
    <div>
      <h3>Save a New Template</h3>
      <input
        type="text"
        placeholder="Template Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <textarea
        placeholder="JSON Data"
        value={jsonData}
        onChange={(e) => setJsonData(e.target.value)}
      />
      <input
        type="file"
        accept="application/pdf"
        onChange={(e) => setPdfFile(e.target.files[0])}
      />
      <button onClick={handleSubmit}>Save Template</button>
    </div>
  );
};

export default TemplateForm;
