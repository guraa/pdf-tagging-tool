import React, { useState } from "react";
import axios from "axios";

const TemplateViewer = () => {
  const [id, setId] = useState("");
  const [template, setTemplate] = useState(null);

  const fetchTemplate = async () => {
    try {
      const response = await axios.get(`http://localhost:8080/api/templates/${id}`);
      setTemplate(response.data);
    } catch (error) {
      console.error("Error fetching template:", error.response?.data || error.message);
      alert("Failed to fetch template.");
    }
  };

  return (
    <div>
      <h3>View Template Details</h3>
      <input
        type="text"
        placeholder="Template ID"
        value={id}
        onChange={(e) => setId(e.target.value)}
      />
      <button onClick={fetchTemplate}>Fetch Template</button>

      {template && (
        <div>
          <h4>{template.name}</h4>
          <pre>{JSON.stringify(JSON.parse(template.jsonData), null, 2)}</pre>
          <embed
            src={`data:application/pdf;base64,${template.pdfBlob}`}
            type="application/pdf"
            width="600"
            height="400"
          />
        </div>
      )}
    </div>
  );
};

export default TemplateViewer;
