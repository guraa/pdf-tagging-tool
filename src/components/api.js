import axios from "axios";

const API_BASE_URL = "http://localhost:8085/api/templates";

export const saveTemplate = async (template) => {
    console.log(template)
  return await axios.post(API_BASE_URL, template);
};

export const deleteTemplate = async (id) => {
    return await axios.delete(`${API_BASE_URL}/${id}`);
  };

export const fetchAllTemplates = async () => {
  return await axios.get(API_BASE_URL);
};

export const fetchTemplateById = async (id) => {
console.log(fetchTemplateById)
  return await axios.get(`${API_BASE_URL}/${id}`);
};
