import React, { useState, useRef, useCallback, useEffect  } from 'react';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.entry'; 
import CanvasDisplay from './components/CanvasDisplay';
import TaggingModal from './components/TaggingModal';
import TaggedElementsView from './components/TaggedElementsView'; 
import MergeModal from './components/MergeModal';  
import EditBoxModal from './components/EditBoxModal';  
import { Button, Modal, Form } from 'react-bootstrap';
import { DragDropContext } from '@hello-pangea/dnd';
import TableEditModal from './components/TableEditModal';
import 'font-awesome/css/font-awesome.min.css';
import _ from 'lodash';
import { produce }from 'immer';



pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;


const convertToCm = (pixels, viewportScale) => ((pixels / 72) * 2.54) / viewportScale;

const convertTaggedElementsToCm = (taggedElements, viewportScale) => {
    return taggedElements.map((element) => ({
        ...element,
        x: convertToCm(element.x, viewportScale),
        y: convertToCm(element.y, viewportScale),
        width: convertToCm(element.width, viewportScale),
        height: convertToCm(element.height, viewportScale),
    }));
};

function App() {
    const [pdfDoc, setPdfDoc] = useState(null);
    const [currentPage, setCurrentPage] = useState(0);
    const [showTextModal, setShowTextModal] = useState(false);
    const [showAltTextModal, setShowAltTextModal] = useState(false);
    const [selectedAltText, setSelectedAltText] = useState('');
    const [drawBox, setDrawBox] = useState(null);
    const [selectedBoxName, setSelectedBoxName] = useState('');
    const [headingType, setHeadingType] = useState('Paragraph');
    const [language, setLanguage] = useState('sv'); 
    const [selectedImageIndex, setSelectedImageIndex] = useState(null); 
    const [showMergeModal, setShowMergeModal] = useState(false);  
    const [mergeCandidate, setMergeCandidate] = useState(null);  
    const [showEditBoxModal, setShowEditBoxModal] = useState(false);  
    const [selectedBoxIndex, setSelectedBoxIndex] = useState(null);  
    const [uploadedFonts, setUploadedFonts] = useState([]); 
    const [showFontModal, setShowFontModal] = useState(false); 
    const [selectedFontFile, setSelectedFontFile] = useState(null); 
    const [showSectionModal, setShowSectionModal] = useState(false);
    const [sectionName, setSectionName] = useState('');
    const [taggedElements, setTaggedElements] = useState([]);
    const [rowCount, setRowCount] = useState(2); // Default to 2 rows
    const [colCount, setColCount] = useState(2); // Default to 2 columns
    const [showTableEditModal, setShowTableEditModal] = useState(false);
    const [selectedBox, setSelectedBox] = useState(null);
    const [rowPositions, setRowPositions] = useState([]);
    const [colPositions, setColPositions] = useState([]);
    const [selectedTableData, setSelectedTableData] = useState(null); 
    const [isTableModalOpen, setIsTableModalOpen] = useState(false);

    let idCounter = 0;

    const generateUniqueId = (prefix = 'element') => {
        idCounter += 1; // Increment the counter for every new ID
        return `${prefix}-${Date.now()}-${idCounter}-${Math.floor(Math.random() * 1000)}`;
    };
    const canvasRef = useRef(null);  
    const fileInputRef = useRef(null);

    const openSectionModal = () => setShowSectionModal(true);
    const closeSectionModal = () => {
        setShowSectionModal(false);
        setSectionName('');
    };
const handleSaveTableData = (updatedTableData) => {
    console.log('App.js: Before saving table data');
    console.log('Updated table data:', updatedTableData);
    console.log('Current selectedBox:', selectedBox);

    setTaggedElements((prevElements) =>
        prevElements.map((el) =>
            el.id === updatedTableData.id ? { ...el, ...updatedTableData } : el
        )
    );

    setSelectedBox((prev) =>
        prev?.id === updatedTableData.id ? { ...prev, ...updatedTableData } : prev
    );

    console.log('App.js: After saving table data');
    console.log('Updated taggedElements:', taggedElements);
    console.log('Updated selectedBox:', selectedBox);
};

const onEditableTableModalOpen = (tableData) => {
    setSelectedTableData({
        rowPositions: tableData.rowPositions || [],
        colPositions: tableData.colPositions || [],
        box: tableData.box || { width: 500, height: 300 }, // Default dimensions
    });
    setIsTableModalOpen(true); // Open the modal
};

const handleTableUpdate = (updatedData) => {
    console.log("Updated table data:", updatedData);
    // Save the updated data back to state or API
    setSelectedTableData(updatedData); // Update the local table data
};
    useEffect(() => {
        if (selectedBox) {
            const updatedBox = taggedElements.find((el) => el.id === selectedBox.id);
            if (updatedBox) {
                setSelectedBox(updatedBox);
                console.log('useEffect selectedBox:', updatedBox);
            }
        }
    }, [taggedElements]);
    
    useEffect(() => {
        console.log("Updated taggedElements:", taggedElements);
    }, [taggedElements]);
    
    useEffect(() => {
        console.log("Updated selectedBox:", selectedBox);
    }, [selectedBox]);
    
    const loadPdf = async () => {
        const file = fileInputRef.current.files[0];
        if (!file) return;
    
        const typedarray = new Uint8Array(await file.arrayBuffer());
        const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;
        setPdfDoc(pdf);
        setCurrentPage(0);
        setTaggedElements([]); // Reset tagged elements when a new PDF is loaded
    
        // Extract image and table boxes from PDF, ensuring each gets a unique ID
        const imageBoxes = await extractImageBoxesFromPdf(pdf);
        const tableBoxes = await extractTableBoxesFromPdf(pdf);
        const combinedBoxes = imageBoxes.map((imageBox) => {
            const tablesForImage = tableBoxes.filter(
                (table) => table.page === imageBox.page
            );
            return {
                ...imageBox,
                tables: tablesForImage, // Attach tables belonging to the same page as the image
            };
        });
        // Ensure each element has a unique ID
        const uniqueCombinedBoxes = combinedBoxes.map((box) => ({
            ...box,
            id: generateUniqueId(box.type) // Ensure unique ID for each box
        }));
        const uniqueTableBoxes = tableBoxes.map((box) => ({
            ...box,
            id: generateUniqueId('table') // Ensure unique ID for each table box
        }));
    
        // Combine all tagged elements in a single state update
        setTaggedElements([...uniqueCombinedBoxes, ...uniqueTableBoxes]);
    
        // Log taggedElements to check if IDs are set correctly
        console.log("Tagged elements after loadPdf:", [...uniqueCombinedBoxes, ...uniqueTableBoxes]);
    };
    
    
    
      const addSection = () => {
        if (sectionName.trim() === '') return; // Prevent empty section names
        const newSection = {
            id: generateUniqueId('section'),  // Use generateUniqueId to ensure unique section ID
            type: 'section',
            name: sectionName,
            children: [] // Empty children for a new section
        };
        setTaggedElements((prev) => [...prev, newSection]);
        closeSectionModal();
    };

    const onDragEnd = (result) => {
        const { source, destination } = result;
    
        if (!destination) {
            console.log("Drag ended outside of any droppable area.");
            return;
        }
        const openTableEditModal = () => {
            if (pdfDoc) {
                setShowTableEditModal(true);
            } else {
                console.warn("Attempted to open TableEditModal before pdfDoc was loaded.");
            }
        };

        
    
        const handleSectionMove = (sourceIndex, destinationIndex, elements) => {
            // Clone the entire elements array to ensure immutability
            const updatedElements = [...elements];
            
            // Find only sections in elements, while keeping their children intact
            const sectionIndices = updatedElements.reduce((indices, el, index) => {
                if (el.type === 'section') indices.push(index);
                return indices;
            }, []);
            
            // Identify the actual indices in the original array for source and destination
            const actualSourceIndex = sectionIndices[sourceIndex];
            const actualDestinationIndex = sectionIndices[destinationIndex];
            
            // Remove the section from its source position
            const [movedSection] = updatedElements.splice(actualSourceIndex, 1);
            
            // Insert the section at the new destination position
            updatedElements.splice(actualDestinationIndex, 0, movedSection);
            
            console.log("Moved top-level section:", movedSection);
            return updatedElements;
        };
        
    
        const handleItemMove = (source, destination, elements) => {
            // Clone each element's children to avoid mutating the original structure
            const updatedElements = elements.map((element) =>
                element.type === "section" ? { ...element, children: [...element.children] } : { ...element }
            );
    
            const findSectionById = (sectionId) =>
                updatedElements.find((item) => `section-${item.id}` === sectionId);
    
            const sourceSection = source.droppableId === "ungrouped-items" ? null : findSectionById(source.droppableId);
            const destinationSection = destination.droppableId === "ungrouped-items" ? null : findSectionById(destination.droppableId);
    
            let movedItem;
    
            try {
                if (sourceSection) {
                    movedItem = sourceSection.children.splice(source.index, 1)[0];
                    console.log("Moved item from section:", movedItem);
                } else {
                    movedItem = updatedElements.splice(source.index, 1)[0];
                    console.log("Moved item from ungrouped list:", movedItem);
                }
    
                if (destinationSection) {
                    destinationSection.children.splice(destination.index, 0, movedItem);
                    console.log("Added item to destination section's children:", destinationSection.children);
                } else {
                    updatedElements.splice(destination.index, 0, movedItem);
                    console.log("Added item to ungrouped list at index", destination.index);
                }
            } catch (error) {
                console.error("Error during setTaggedElements operation:", error.message);
                return elements;
            }
    
            return updatedElements;
        };
    
        setTaggedElements((prevElements) => {
            if (source.droppableId === "sections" && destination.droppableId === "sections") {
                return handleSectionMove(source.index, destination.index, prevElements);
            } else {
                return handleItemMove(source, destination, prevElements);
            }
        });
    };
    
    
    
      
    
    
    const handleFontFileChange = (e) => {
        const file = e.target.files[0];
        setSelectedFontFile(file);
    };

    const handleTableChange = (updatedTableData) => {
        setTaggedElements((prevElements) =>
            prevElements.map((element) =>
                element.id === updatedTableData.id ? { ...element, ...updatedTableData } : element
            )
        );
    };
    
    const handleFontUpload = async () => {
        if (selectedFontFile) {
            const reader = new FileReader();
            reader.onload = function (event) {
                const base64Font = event.target.result.split(',')[1]; 
                const newFont = { name: selectedFontFile.name, base64: base64Font };
                setUploadedFonts((prevFonts) => [...prevFonts, newFont]);
            };
            reader.readAsDataURL(selectedFontFile);
            setSelectedFontFile(null); 
        }
    };

    const openFontModal = () => setShowFontModal(true);
    const closeFontModal = () => setShowFontModal(false);

    const extractImageBoxesFromPdf = async (pdf) => {
        const imageBoxes = [];

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 1.5 });
            const operatorList = await page.getOperatorList();
            const transformStack = []; 
            let currentTransformMatrix = new DOMMatrix(); 

            operatorList.fnArray.forEach((fn, index) => {
                const args = operatorList.argsArray[index];

                if (fn === pdfjsLib.OPS.save) {
                    transformStack.push(currentTransformMatrix);
                } else if (fn === pdfjsLib.OPS.restore) {
                    currentTransformMatrix = transformStack.pop() || new DOMMatrix();
                } else if (fn === pdfjsLib.OPS.transform) {
                    const [a, b, c, d, e, f] = args;
                    currentTransformMatrix = currentTransformMatrix.multiply(new DOMMatrix([a, b, c, d, e, f]));
                } else if (fn === pdfjsLib.OPS.paintImageXObject || fn === pdfjsLib.OPS.paintJpegXObject) {
                    const imgX = currentTransformMatrix.e * viewport.scale;
                    const imgY = currentTransformMatrix.f * viewport.scale;
                    const imgWidth = Math.abs(currentTransformMatrix.a * viewport.scale);
                    const imgHeight = Math.abs(currentTransformMatrix.d * viewport.scale);
                    const adjustedImgY = viewport.height - imgY;

                    imageBoxes.push({
                        type: 'image',
                        name: args[0], 
                        x: imgX,
                        y: adjustedImgY, 
                        width: imgWidth,
                        height: imgHeight,
                        page: i,
                        alt: '', 
                        imageSrc: 'https://via.placeholder.com/150',
                    });
                }
            });
        }
        return imageBoxes;
    };
    

    const handleSaveAltText = () => {
        setTaggedElements((prev) => {
            const updatedTags = prev.map((el, index) => {
                if (index === selectedImageIndex && el.type === 'image') {
                    return { ...el, alt: selectedAltText };
                }
                return el;
            });
            return updatedTags;
        });
        setShowAltTextModal(false); 
    };

    const createTaggedPdf = async () => {
        try {
            if (!fileInputRef.current.files[0]) {
                alert('Please upload a PDF first.');
                return;
            }

            const currentPdfPage = await pdfDoc.getPage(currentPage + 1);
            const viewportScale = currentPdfPage.getViewport({ scale: 1.5 }).scale;
            const convertedTags = convertTaggedElementsToCm(taggedElements, viewportScale);
            const pdfFile = fileInputRef.current.files[0];

            const formData = new FormData();
            formData.append('pdf', pdfFile);
            formData.append('tags', JSON.stringify(convertedTags));

            const response = await axios.post('http://localhost:8085/create-accessible-pdf', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                responseType: 'blob',
            });

            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'tagged_pdf_example.pdf';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } catch (error) {
            console.error('Error creating tagged PDF:', error);
            alert('An error occurred while creating the tagged PDF.');
        }
    };

    const extractTableBoxesFromPdf = async (pdf) => {
        const tableBoxes = [];
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 1.5 });
            const textContent = await page.getTextContent();

            const tableDetected = textContent.items.some((item) => item.str.includes('Table'));
            if (tableDetected) {
                tableBoxes.push({
                    type: 'table',
                    name: 'Detected Table',
                    x: 50,
                    y: 50,
                    width: 400,
                    height: 200,
                    page: i,
                    rowCount: 5,
                    colCount: 3,
                });
            }
        }
        return tableBoxes;
    };
    
    const handleSaveTag = ({ selectedFont, isTable }) => {
        if (!drawBox || !selectedBoxName) return;
    
        const newTag = {
            id: generateUniqueId(isTable ? "table" : "text"),
            type: isTable ? "table" : "text",
            name: selectedBoxName,
            tag: isTable ? null : headingType,
            language: language,
            font: selectedFont,
            x: drawBox.x,
            y: drawBox.y,
            width: drawBox.width,
            height: drawBox.height,
            page: currentPage + 1,
            rowCount: isTable ? rowCount : undefined, 
            colCount: isTable ? colCount : undefined,
            isTable: isTable,
            containsTable: isTable,
        };
    
        // Determine if the new tag overlaps with any existing elements
        const overlappingBoxes = taggedElements.filter((box) => doBoxesOverlap(box, newTag));
        if (overlappingBoxes.length > 0) {
            setMergeCandidate({ newBox: newTag, overlappingBoxes }); // Set merge candidate for modal
            setShowMergeModal(true);                                 // Open the modal for merging
            return; // Stop here as we need user confirmation for merge
        }
    
        // Add the new tag to the appropriate location
        setTaggedElements((prevElements) => {
            const updatedElements = prevElements.map((element) => {
                if (
                    element.type === "section" &&
                    element.x <= newTag.x &&
                    element.y <= newTag.y &&
                    element.x + element.width >= newTag.x + newTag.width &&
                    element.y + element.height >= newTag.y + newTag.height
                ) {
                    // Add new tag to this section's children
                    return {
                        ...element,
                        children: [...element.children, newTag],
                    };
                }
                return element;
            });
    
            // Check if the tag was added to any section's children
            const isContainedInSection = updatedElements.some(
                (element) => element.type === "section" && element.children.includes(newTag)
            );
    
            // If not part of any section, add as a standalone element
            if (!isContainedInSection) {
                updatedElements.push(newTag);
            }
    
            return updatedElements;
        });
    
        setDrawBox(null);
        setShowTextModal(false);
    };
    



const morphBoxes = (newBox) => {
    const overlappingBoxes = taggedElements.filter((box) => doBoxesOverlap(box, newBox));
    if (overlappingBoxes.length > 0) {
        setMergeCandidate({ newBox, overlappingBoxes }); // Set merge candidate for modal
        setShowMergeModal(true);                         // Open the modal for merging
    } else {
        setTaggedElements((prev) => [...prev, newBox]);  // Otherwise, add the new box
    }
};

    const extractTextBoxesFromPdf = async () => {
        const textBoxes = [];

        for (let i = 1; i <= pdfDoc.numPages; i++) {
            const page = await pdfDoc.getPage(i);
            const viewport = page.getViewport({ scale: 1.5 });
            const textContent = await page.getTextContent();

            textContent.items.forEach((item) => {
                const [a, b, c, d, e, f] = item.transform;
                const x = e * viewport.scale;
                const y = viewport.height - f * viewport.scale;
                const width = item.width * viewport.scale;
                const height = Math.abs(d) * viewport.scale;

                if (!taggedElements.some((box) => doBoxesOverlap(box, { x, y: y - height, width, height }))) {
                    textBoxes.push({
                        type: 'text',
                        name: item.str.substring(1,10), // Name to be set manually later
                        tag: 'Paragraph',  // Tag to be set manually later
                        x,
                        y: y - height, // Adjust to align properly
                        width,
                        height,
                        page: i,
                        text: item.str // Extracted text
                    });
                }
            });
        }

        setTaggedElements((prev) => [...prev, ...textBoxes]);
    };

    const doBoxesOverlap = (box1, box2) => {
        return (
            box1.x < box2.x + box2.width &&
            box1.x + box1.width > box2.x &&
            box1.y < box2.y + box2.height &&
            box1.y + box1.height > box2.y
        );
    };

    
    useEffect(() => {
        console.log("Updated taggedElements:", taggedElements);
    }, [taggedElements]);

    useEffect(() => {
        console.log("Selected Box in App.js:", selectedBox);
    }, [selectedBox]);
    useEffect(() => {
        console.log("Updated selectedBox in App.js:", selectedBox);
    }, [selectedBox]);
    
    useEffect(() => {
        console.log("Updated taggedElements in App.js:", taggedElements);
    }, [taggedElements]);
    

    return (
        <div className="container-fluid" style={{ height: '100vh' }}>
            <div className="row" style={{ height: '100%' }}>
                
                {/* Left Panel for Upload and Tagging */}
                <div className="col-md-3 p-4 d-flex flex-column justify-content-between" style={{
                    backgroundColor: '#f8f9fa',
                    boxShadow: '2px 2px 8px rgba(0,0,0,0.1)',
                    borderRadius: '8px',
                    height: '100vh',
                    border: '1px solid #e0e0e0'
                }}>
                    <div>
                        <h2 className="mb-3 font-weight-bold text-dark">
                            <i className="fas fa-file-upload mr-2"></i>Upload a PDF
                        </h2>
                    </div>
    
                    <div className="form-group bg-white p-3 rounded shadow mb-4">
                        <label className="font-weight-bold text-secondary">Upload Section</label>
                        <input
                            type="file"
                            ref={fileInputRef}
                            accept="application/pdf"
                        />
                        <button className="btn btn-primary btn-block mt-3" onClick={loadPdf}>
                            <i className="fas fa-upload mr-2"></i>Load PDF
                        </button>
                    </div>
    
                    <div className="form-group bg-white p-3 rounded shadow mb-4">
                        <label className="font-weight-bold text-secondary">Actions</label>
                        <button className="btn btn-info btn-block mb-2" onClick={extractTextBoxesFromPdf}>
                            <i className="fas fa-text-height mr-2"></i>Auto Select All Text
                        </button>
                        <button className="btn btn-secondary btn-block" onClick={openFontModal}>
                            <i className="fas fa-font mr-2"></i>Upload Fonts
                        </button>
                    </div>
    
                    <button className="btn btn-success w-100" onClick={createTaggedPdf} style={{ borderRadius: '8px' }}>
                        <i className="fas fa-save mr-2"></i>Create Tagged PDF
                    </button>
                </div>
                
                {/* Center PDF Preview Panel */}
                <div className="col-md-6 mx-auto p-3" style={{
                    backgroundColor: 'white',
                    boxShadow: '2px 2px 8px rgba(0,0,0,0.1)',
                    borderRadius: '8px',
                    height: '100vh',
                    border: '1px solid #e0e0e0',
                    overflow: 'hidden'
                }}>
                    {pdfDoc && (
                        <div style={{
                            position: 'relative',
                            flexGrow: 1,
                            overflowY: 'auto',
                            maxHeight: 'calc(100vh - 100px)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            <CanvasDisplay
                            
                                pdfDoc={pdfDoc}
                                currentPage={currentPage}
                                boxes={taggedElements}
                                setDrawBox={setDrawBox}
                                setShowTextModal={setShowTextModal}
                                setSelectedAltText={setSelectedAltText}
                                setShowEditBoxModal={setShowEditBoxModal}
                                setSelectedBoxIndex={setSelectedBoxIndex}
                                setTaggedElements={setTaggedElements} 
                                setShowAltTextModal={setShowAltTextModal}
                                setSelectedImageIndex={setSelectedImageIndex}
                                setSelectedBox={setSelectedBox}
                                setShowTableEditModal={setShowTableEditModal}
                                selectedBox={selectedBox}        // Pass selectedBox state
                                canvasRef={canvasRef}
                                tableData={{
                                    rowCount: selectedBox?.rowCount || 2,  // Default to 2 if no rowCount in selectedBox
                                    colCount: selectedBox?.colCount || 2,  // Default to 2 if no colCount in selectedBox
                                    rowPositions: selectedBox?.rowPositions || [],
                                    colPositions: selectedBox?.colPositions || []
                                }}
                            />
                        </div>
                    )}
                    <div className="controls my-3">
                        <button className="btn btn-secondary mr-2" onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 0))}>Previous Page</button>
                        <button className="btn btn-secondary" onClick={() => setCurrentPage((prev) => Math.min(prev + 1, pdfDoc.numPages - 1))}>Next Page</button>
                    </div>
                </div>
                
                {/* Right Panel for Tagged Elements */}
                <div className="col-md-3 p-4" style={{
                    backgroundColor: '#f8f9fa',
                    boxShadow: '2px 2px 8px rgba(0,0,0,0.1)',
                    borderRadius: '8px',
                    height: '100vh',
                    border: '1px solid #e0e0e0',
                    overflowY: 'auto'
                }}>
                    <Button onClick={openSectionModal} className="mb-3">Add Section</Button>
                    <Modal show={showSectionModal} onHide={closeSectionModal}>
                        <Modal.Header closeButton>
                            <Modal.Title>Create Section</Modal.Title>
                        </Modal.Header>
                        <Modal.Body>
                            <Form.Group>
                                <Form.Label>Section Name</Form.Label>
                                <Form.Control
                                    type="text"
                                    placeholder="Enter section name"
                                    value={sectionName}
                                    onChange={(e) => setSectionName(e.target.value)}
                                />
                            </Form.Group>
                        </Modal.Body>
                        <Modal.Footer>
                            <Button variant="secondary" onClick={closeSectionModal}>Cancel</Button>
                            <Button variant="primary" onClick={addSection}>Add Section</Button>
                        </Modal.Footer>
                    </Modal>
    
                    <DragDropContext onDragEnd={onDragEnd}>
                        <TaggedElementsView
                            taggedElements={taggedElements}
                            setTaggedElements={setTaggedElements}
                        />
                    </DragDropContext>
                </div>
            </div>
    
            {/* Modals and other components */}
            <TaggingModal
                show={showTextModal}
                handleClose={() => setShowTextModal(false)}
                handleSave={handleSaveTag}
                languages={[{ code: 'sv', name: 'Swedish' }, { code: 'en', name: 'English' }]}
                headingType={headingType}
                setHeadingType={setHeadingType}
                language={language}
                selectedBox={drawBox}
                setLanguage={setLanguage}
                selectedBoxName={selectedBoxName}
                setSelectedBoxName={setSelectedBoxName}
                fonts={uploadedFonts}
                rowCount={rowCount} 
                setRowCount={setRowCount} 
                colCount={colCount} 
                setColCount={setColCount}
                pdfDoc={pdfDoc} 
            />
    
            <TaggingModal
                show={showAltTextModal}
                handleClose={() => setShowAltTextModal(false)}
                handleSave={handleSaveAltText}
                altText={selectedAltText}
                setAltText={setSelectedAltText}
                isAltText={true}
            />
    
            <Modal show={showFontModal} onHide={closeFontModal}>
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
                    <Button variant="primary" onClick={handleFontUpload}>Upload</Button>
                    <Button variant="secondary" onClick={closeFontModal}>Close</Button>
                </Modal.Footer>
            </Modal>
    
            <MergeModal
                show={showMergeModal}
                handleClose={() => setShowMergeModal(false)}
                mergeCandidate={mergeCandidate}
                setTaggedElements={setTaggedElements}
            />
    
            <EditBoxModal
                show={showEditBoxModal}
                handleClose={() => setShowEditBoxModal(false)}
                taggedElements={taggedElements}
                setTaggedElements={setTaggedElements}
                selectedBoxIndex={selectedBoxIndex}
                languages={[{ code: 'sv', name: 'Swedish' }, { code: 'en', name: 'English' }]}
                fonts={uploadedFonts}
                setRowCount={setRowCount}
                setColCount={setColCount}
                onSave={handleSaveTableData} 
                pdfDoc={pdfDoc} 
            />
    
    {showTableEditModal && selectedBox && (
    <>
        {console.log("Opening TableEditModal with selectedBox:", selectedBox)}
        <TableEditModal
    isOpen={showTableEditModal}
    tableData={selectedTableData}
    onClose={() => setShowTableEditModal(false)}
    onTableChange={(updatedTableData) => {
        setTaggedElements((prev) =>
            prev.map((element) =>
                element.id === updatedTableData.id
                    ? { ...element, ...updatedTableData }
                    : element
            )
        );
    }}
    pdfDoc={pdfDoc}
/>

    </>
)}

        </div>
    );
}    
export default App;