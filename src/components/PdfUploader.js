import React, { useRef, useImperativeHandle } from "react";
import { Button } from "react-bootstrap";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.entry";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const PdfUploader = React.forwardRef(
  (
    {
      fileInputRef,
      setPdfDoc,
      setCurrentPage,
      setTaggedElements,
      generateUniqueId,
      extractImageBoxesFromPdf,
      extractTableBoxesFromPdf,
    },
    ref
  ) => {
    const internalFileInputRef = useRef(null);

    const loadPdf = async () => {
      const inputRef = fileInputRef?.current || internalFileInputRef.current;

      if (!inputRef || !inputRef.files?.length) {
        console.error("No file selected.");
        alert("Please select a PDF file.");
        return;
      }

      const file = inputRef?.files?.[0];
      if (!file) {
        console.error("No file selected.");
        alert("Please select a PDF file.");
        return;
      }

      await loadPdfFromFile(file);
    };

    const loadPdfFromFile = async (file) => {
      try {
        console.log("Loading PDF file:", file.name);
        const typedarray = new Uint8Array(await file.arrayBuffer());
        
        // Enable the worker to improve performance
        const loadingTask = pdfjsLib.getDocument({
          data: typedarray,
          nativeImageDecoderSupport: 'decode',
          ignoreErrors: true
        });
        
        // Set up a progress callback
        loadingTask.onProgress = ({ loaded, total }) => {
          const percent = (loaded / total) * 100;
          console.log(`Loading PDF: ${Math.round(percent)}%`);
        };
        
        const pdf = await loadingTask.promise;

        console.log("PDF loaded successfully:", pdf);
        console.log("Number of pages:", pdf.numPages);

        setPdfDoc(pdf);
        setCurrentPage(0);
        setTaggedElements([]); // Clear existing elements

        // Extract metadata
        const metadata = await pdf.getMetadata();
        console.log("PDF Metadata:", metadata);

        // Extract images from the PDF
        console.log("Extracting images from PDF...");
        const imageBoxes = await extractImageBoxesFromPdf(pdf);
        console.log("Extracted images:", imageBoxes);

        // Extract tables from the PDF if the function exists
        console.log("Extracting tables from PDF...");
        let tableBoxes = [];
        
        if (typeof extractTableBoxesFromPdf === 'function') {
          tableBoxes = await extractTableBoxesFromPdf(pdf);
          console.log("Extracted tables:", tableBoxes);
        } else {
          console.warn("extractTableBoxesFromPdf is not defined, skipping table extraction");
        }

        // Add IDs to all boxes
        const processedImageBoxes = imageBoxes.map((imageBox) => ({
          ...imageBox,
          id: generateUniqueId("image"),
        }));

        const processedTableBoxes = tableBoxes.map((tableBox) => ({
          ...tableBox,
          id: generateUniqueId("table"),
        }));

        // Update tagged elements with detected images and tables
        const newTaggedElements = [...processedImageBoxes, ...processedTableBoxes];
        setTaggedElements(newTaggedElements);

        console.log("Tagged elements after loadPdf:", newTaggedElements);
        
        return pdf;
      } catch (error) {
        console.error("Error loading PDF:", error);
        alert(`Failed to load PDF: ${error.message}`);
        return null;
      }
    };

    // Expose loadPdfFromFile via ref
    useImperativeHandle(ref, () => ({
      loadPdfFromFile,
    }));

    return (
      <div className="form-group bg-white p-3 rounded shadow mb-4">
        <h5 className="font-weight-bold text-secondary mb-3">
          <i className="fas fa-folder-open mr-2"></i> Select a PDF
        </h5>
        <input
          type="file"
          ref={fileInputRef || internalFileInputRef}
          accept="application/pdf"
          className="form-control"
        />
        <Button className="btn btn-primary btn-block mt-3" onClick={loadPdf}>
          <i className="fas fa-upload mr-2"></i> Load PDF
        </Button>
      </div>
    );
  }
);

export default PdfUploader;