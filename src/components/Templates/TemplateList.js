import React, { useEffect, useState } from "react";
import axios from "axios";

const TemplateList = ({ onSelectTemplate }) => {
  const [templates, setTemplates] = useState([]);

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const response = await axios.get("http://localhost:8080/api/templates");
        setTemplates(response.data); // Array of templates with `id` and `name`
      } catch (error) {
        console.error("Error fetching templates:", error.response?.data || error.message);
        alert("Failed to fetch templates.");
      }
    };

    fetchTemplates();
  }, []);

  return (
    <div>
      <h3>Available Templates</h3>
      <ul>
        {templates.map((template) => (
          <li key={template.id}>
            <button onClick={() => onSelectTemplate(template.id)}>
              {template.name} (ID: {template.id})
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TemplateList;
