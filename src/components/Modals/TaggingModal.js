import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Modal, Button, Form, Tabs, Tab } from 'react-bootstrap';
import EditableTable from '../EditableTable';
import _ from 'lodash';

/**
 * TaggingModal - Modal for tagging PDF elements
 * 
 * This component handles tagging of PDF elements (text, images, tables)
 * with appropriate metadata and accessibility information.
 */
const TaggingModal = ({
    show,
    handleClose,
    languages = [],
    taggedElements,
    generateUniqueId,
    setTaggedElements,
    setMergeCandidate,
    setShowMergeModal,
    headingType,
    setHeadingType,
    language,
    setLanguage,
    selectedBoxName,
    setSelectedBoxName,
    isAltText = false,
    fonts = [],
    rowCount,
    setRowCount,
    colCount,
    setColCount,
    selectedBox,
    pdfDoc,
    altText,
    setAltText,
    handleSave,
}) => {
    // Local state for form inputs
    const [boxDetails, setBoxDetails] = useState({
        name: '',
        tag: 'Paragraph',
        language: 'sv',
        font: '',
        altText: '',
        containsTable: false,
        tables: [],
    });

    // Track selected font
    const [selectedFont, setSelectedFont] = useState('');
    
    // Reference to the canvas for rendering selected area
    const canvasRef = useRef(null);
    
    // Active tab state
    const [activeTab, setActiveTab] = useState('general');

    // Initialize form state when the modal opens or selectedBox changes
    useEffect(() => {
        if (selectedBox) {
            setBoxDetails({
                name: selectedBox.name || '',
                tag: selectedBox.tag || 'Paragraph',
                language: selectedBox.language || 'sv',
                font: selectedBox.font || '',
                altText: selectedBox.alt || altText || '',
                containsTable: !!selectedBox.containsTable,
                tables: selectedBox.tables || [],
            });
            
            // Set the tab based on the box type
            if (selectedBox.type === 'image') {
                setActiveTab('image');
            } else if (selectedBox.type === 'table' || selectedBox.containsTable) {
                setActiveTab('table');
            } else {
                setActiveTab('general');
            }
        }
        
        // If alt text is being edited, initialize with the provided value
        if (isAltText && altText) {
            setBoxDetails(prev => ({ ...prev, altText }));
        }
    }, [selectedBox, show, isAltText, altText]);

    // Render the selected area of the PDF to the canvas
    const renderSelectedArea = useCallback(async () => {
        if (!pdfDoc || !canvasRef.current || !selectedBox) return;

        try {
            const canvas = canvasRef.current;
            const context = canvas.getContext('2d');
            context.clearRect(0, 0, canvas.width, canvas.height);

            const page = await pdfDoc.getPage(selectedBox.page);
            const scale = 1.5;
            const viewport = page.getViewport({ scale });

            // Calculate the crop area
            const cropX = selectedBox.x * scale;
            const cropY = selectedBox.y * scale;
            const cropWidth = selectedBox.width * scale;
            const cropHeight = selectedBox.height * scale;

            // Set canvas size to match the crop dimensions
            canvas.width = cropWidth;
            canvas.height = cropHeight;

            // Render only the selected portion of the PDF
            const renderContext = {
                canvasContext: context,
                viewport: viewport,
                transform: [scale, 0, 0, scale, -cropX, -cropY],
            };

            await page.render(renderContext).promise;
        } catch (error) {
            console.error('Error rendering selected area:', error);
        }
    }, [pdfDoc, selectedBox]);

    // Render the selected area when the modal is shown
    useEffect(() => {
        if (show && (activeTab === 'image' || activeTab === 'table')) {
            renderSelectedArea();
        }
    }, [show, activeTab, renderSelectedArea]);

    // Check if two boxes overlap
    const doBoxesOverlap = (box1, box2) => {
        const buffer = 1; // Small buffer for edge cases
        return (
            box1.x < box2.x + box2.width + buffer &&
            box1.x + box1.width + buffer > box2.x &&
            box1.y < box2.y + box2.height + buffer &&
            box1.y + box1.height + buffer > box2.y
        );
    };

    // Handle form input changes
    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        const newValue = type === 'checkbox' ? checked : value;
        
        setBoxDetails(prev => ({ ...prev, [name]: newValue }));
        
        // Update external state for some fields
        if (name === 'name') {
            setSelectedBoxName(value);
        } else if (name === 'tag') {
            setHeadingType(value);
        } else if (name === 'language') {
            setLanguage(value);
        } else if (name === 'altText') {
            setAltText && setAltText(value);
        }
    };

    // Handle font selection
    const handleFontSelect = (fontBase64) => {
        const font = fonts.find((f) => f.base64 === fontBase64);
        setSelectedFont(font ? { name: font.name, base64: font.base64 } : '');
    };

    // Handle table data changes
    const handleTableChange = (newTableData) => {
        setBoxDetails(prev => ({
            ...prev,
            tables: newTableData,
        }));
    };

    // Handle save button click
    const handleSaveClick = () => {
        // If this is alt text only, use the simplified save handler
        if (isAltText) {
            handleSave();
            return;
        }

        // Otherwise, prepare a new tag
        const isTable = activeTab === 'table' || boxDetails.containsTable;
        
        if (!selectedBox) {
            console.error("No box selected for tagging");
            return;
        }
        
        if (!selectedBoxName && !isAltText) {
            alert("Please enter a name for this element");
            return;
        }

        // Save with the appropriate tag type
        handleSave({ 
            selectedFont, 
            isTable,
            boxDetails
        });
    };

    return (
        <Modal show={show} onHide={handleClose} size="lg" backdrop="static">
            <Modal.Header closeButton>
                <Modal.Title>
                    {isAltText ? 'Set Alt Text' : (
                        selectedBox?.type === 'image' ? 'Tag Image' : 
                        selectedBox?.type === 'table' ? 'Tag Table' : 
                        'Tag Text Element'
                    )}
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Tabs
                    activeKey={activeTab}
                    onSelect={(k) => setActiveTab(k)}
                    className="mb-3"
                >
                    {/* General Properties Tab */}
                    <Tab eventKey="general" title="General">
                        <Form>
                            <Form.Group className="mb-3">
                                <Form.Label>Element Name</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="name"
                                    value={boxDetails.name}
                                    onChange={handleInputChange}
                                    placeholder="Enter a descriptive name"
                                />
                            </Form.Group>

                            <Form.Group className="mb-3">
                                <Form.Label>Heading Type</Form.Label>
                                <Form.Control
                                    as="select"
                                    name="tag"
                                    value={boxDetails.tag}
                                    onChange={handleInputChange}
                                >
                                    <option value="P">Paragraph</option>
                                    <option value="H1">Heading 1</option>
                                    <option value="H2">Heading 2</option>
                                    <option value="H3">Heading 3</option>
                                    <option value="H4">Heading 4</option>
                                    <option value="LI">List Item</option>
                                    <option value="FIGCAPTION">Figure Caption</option>
                                </Form.Control>
                            </Form.Group>

                            <Form.Group className="mb-3">
                                <Form.Label>Language</Form.Label>
                                <Form.Control
                                    as="select"
                                    name="language"
                                    value={boxDetails.language}
                                    onChange={handleInputChange}
                                >
                                    {languages.map((lang) => (
                                        <option key={lang.code} value={lang.code}>
                                            {lang.name}
                                        </option>
                                    ))}
                                </Form.Control>
                            </Form.Group>

                            <Form.Group className="mb-3">
                                <Form.Label>Font</Form.Label>
                                <Form.Control
                                    as="select"
                                    name="font"
                                    value={selectedFont.base64 || ''}
                                    onChange={(e) => handleFontSelect(e.target.value)}
                                >
                                    <option value="">Default Font</option>
                                    {fonts.map((font, index) => (
                                        <option key={index} value={font.base64}>
                                            {font.name}
                                        </option>
                                    ))}
                                </Form.Control>
                            </Form.Group>
                        </Form>
                    </Tab>

                    {/* Image Tab - For image-specific properties */}
                    <Tab eventKey="image" title="Image" disabled={selectedBox?.type !== 'image'}>
                        <Form>
                            <Form.Group className="mb-3">
                                <Form.Label>Alt Text</Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={3}
                                    name="altText"
                                    value={boxDetails.altText}
                                    onChange={handleInputChange}
                                    placeholder="Describe the image for screen readers"
                                />
                                <Form.Text className="text-muted">
                                    Good alt text should concisely describe the content and function of the image.
                                </Form.Text>
                            </Form.Group>

                            <Form.Group className="mb-3">
                                <Form.Check
                                    type="switch"
                                    id="contains-table-switch"
                                    label="This image contains a table"
                                    name="containsTable"
                                    checked={boxDetails.containsTable}
                                    onChange={handleInputChange}
                                />
                            </Form.Group>

                            {/* Preview of the image */}
                            <div className="mt-3">
                                <h6>Image Preview:</h6>
                                <canvas
                                    ref={canvasRef}
                                    style={{
                                        width: '100%',
                                        height: 'auto',
                                        maxHeight: '200px',
                                        border: '1px solid #ccc',
                                        borderRadius: '4px',
                                    }}
                                />
                            </div>
                        </Form>
                    </Tab>

                    {/* Table Tab - For table-specific properties */}
                    <Tab 
                        eventKey="table" 
                        title="Table" 
                        disabled={!boxDetails.containsTable && selectedBox?.type !== 'table'}
                    >
                        <Form>
                            <Form.Group className="mb-3">
                                <Form.Label>Rows</Form.Label>
                                <Form.Control
                                    type="number"
                                    min="1"
                                    name="rowCount"
                                    value={rowCount}
                                    onChange={(e) => setRowCount(Math.max(1, parseInt(e.target.value) || 2))}
                                />
                            </Form.Group>

                            <Form.Group className="mb-3">
                                <Form.Label>Columns</Form.Label>
                                <Form.Control
                                    type="number"
                                    min="1"
                                    name="colCount"
                                    value={colCount}
                                    onChange={(e) => setColCount(Math.max(1, parseInt(e.target.value) || 2))}
                                />
                            </Form.Group>

                            <Form.Group className="mb-3">
                                <Form.Check
                                    type="checkbox"
                                    id="has-header-row"
                                    label="First row is header"
                                    checked={boxDetails.headerRow === 0}
                                    onChange={(e) => {
                                        setBoxDetails(prev => ({
                                            ...prev,
                                            headerRow: e.target.checked ? 0 : null
                                        }));
                                    }}
                                />
                            </Form.Group>

                            <div className="mb-3">
                                <h6>Table Preview:</h6>
                                <canvas
                                    ref={canvasRef}
                                    style={{
                                        width: '100%',
                                        height: 'auto',
                                        border: '1px solid #ccc',
                                        borderRadius: '4px',
                                        marginBottom: '10px',
                                    }}
                                />
                                
                                {/* Table grid visualization would go here */}
                                <div 
                                    style={{
                                        width: '100%',
                                        height: '150px',
                                        border: '1px solid #ccc',
                                        display: 'grid',
                                        gridTemplateColumns: `repeat(${colCount}, 1fr)`,
                                        gridTemplateRows: `repeat(${rowCount}, 1fr)`,
                                    }}
                                >
                                    {Array.from({ length: rowCount * colCount }, (_, i) => {
                                        const row = Math.floor(i / colCount);
                                        const col = i % colCount;
                                        return (
                                            <div 
                                                key={`cell-${row}-${col}`}
                                                style={{
                                                    border: '1px solid #ddd',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    backgroundColor: row === 0 && boxDetails.headerRow === 0 ? '#e9ecef' : 'white',
                                                }}
                                            >
                                                {row === 0 && boxDetails.headerRow === 0 ? 'Header' : `${row+1},${col+1}`}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </Form>
                    </Tab>
                </Tabs>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={handleClose}>
                    Cancel
                </Button>
                <Button variant="primary" onClick={handleSaveClick}>
                    Save
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default TaggingModal;