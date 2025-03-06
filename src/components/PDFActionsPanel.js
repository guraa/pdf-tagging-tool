import React from "react";
import FontManager from "./FontManager";
import TextBlockSelector from "./TextBlockSelector"; 

const PDFActionsPanel = ({ pdfDoc, setTaggedElements, uploadedFonts, onUploadFont }) => {

  return (
    <div className="form-group bg-white p-3 rounded shadow mb-4">
      <h5 className="font-weight-bold text-secondary mb-3">
        <i className="fas fa-tools mr-2"></i> Actions
      </h5>
      <div className="d-flex flex-column">
        {/* Extract Text Action */}
        <TextBlockSelector
          pdfDoc={pdfDoc}
          setTaggedElements={setTaggedElements}
        />

        {/* Font Manager */}
        <FontManager
          uploadedFonts={uploadedFonts}
          onUploadFont={onUploadFont}
        />
      </div>
    </div>
  );
};

export default PDFActionsPanel;
