import React, { useState, useEffect, useRef } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.entry';
import '../App.css';
import EditableTable from './EditableTable';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const EditBoxModal = ({
    show,
    handleClose,
    taggedElements,
    setTaggedElements,
    selectedBoxIndex,
    languages = [],
    fonts = [],
    pdfDoc
}) => {
    const [boxDetails, setBoxDetails] = useState({
        name: '',
        tag: 'Paragraph',
        language: 'sv',
        font: '',
        altText: '',
        containsTable: false,
        tables: [],
    });
    const canvasRef = useRef(null);
    const [drawingBoxes, setDrawingBoxes] = useState([]);
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentBox, setCurrentBox] = useState(null);

    // Prepopulate box details when modal opens
    useEffect(() => {
        if (selectedBoxIndex !== null && taggedElements && taggedElements[selectedBoxIndex]) {
            const selectedBox = taggedElements[selectedBoxIndex];
            setBoxDetails({
                ...boxDetails,
                ...selectedBox,
                name: selectedBox.name || '',
                tag: selectedBox.tag || 'Paragraph',
                language: selectedBox.language || 'sv',
                font: selectedBox.font || '',
                altText: selectedBox.alt || '',
                containsTable: selectedBox.containsTable || false,
                tables: selectedBox.tables || [],
            });
        }
    }, [selectedBoxIndex, taggedElements]);

    useEffect(() => {
        if (boxDetails.containsTable && pdfDoc && canvasRef.current) {
            renderCroppedPdfToCanvas();
        }
    }, [boxDetails.containsTable, pdfDoc, boxDetails.tables]);

    const renderCroppedPdfToCanvas = async () => {
        if (!pdfDoc || !canvasRef.current) {
            console.warn("pdfDoc is not loaded or canvas reference is missing.");
            return;
        }

        try {
            const canvas = canvasRef.current;
            const context = canvas.getContext('2d');
            context.clearRect(0, 0, canvas.width, canvas.height);

            const page = await pdfDoc.getPage(taggedElements[selectedBoxIndex].page);
            const scale = 1.5;
            const viewport = page.getViewport({ scale });

            const cropX = taggedElements[selectedBoxIndex].x * scale;
            const cropY = taggedElements[selectedBoxIndex].y * scale;
            const cropWidth = taggedElements[selectedBoxIndex].width * scale;
            const cropHeight = taggedElements[selectedBoxIndex].height * scale;

            canvas.width = cropWidth;
            canvas.height = cropHeight;

            const renderContext = {
                canvasContext: context,
                viewport: viewport,
                transform: [scale, 0, 0, scale, -cropX, -cropY],
            };

            await page.render(renderContext).promise;

        } catch (error) {
            console.error("Error rendering cropped PDF to canvas:", error);
        }
    };

    const handleSave = () => {
        if (selectedBoxIndex !== null) {
            const updatedElements = [...taggedElements];
            const currentBox = updatedElements[selectedBoxIndex];

            updatedElements[selectedBoxIndex] = {
                ...currentBox,
                name: boxDetails.name,
                tag: currentBox.type === 'image' ? currentBox.tag : boxDetails.tag,
                language: boxDetails.language,
                font: boxDetails.font,
                alt: currentBox.type === 'image' ? boxDetails.altText : currentBox.alt,
                containsTable: boxDetails.containsTable,
                tables: boxDetails.tables,
            };

            setTaggedElements(updatedElements);
        }
        handleClose();
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        const newValue = type === 'checkbox' ? checked : value;
        setBoxDetails((prevDetails) => ({ ...prevDetails, [name]: newValue }));
    };

    const handleTablesChange = (newTables) => {
        setBoxDetails((prevDetails) => ({
            ...prevDetails,
            tables: newTables,
        }));
    };

    const handleMouseDown = (e) => {
        if (e.button !== 0) return;
        setIsDrawing(true);
        const rect = e.target.getBoundingClientRect();
        const startX = e.clientX - rect.left;
        const startY = e.clientY - rect.top;
        setCurrentBox({ x: startX, y: startY, width: 0, height: 0 });
    };

    const handleMouseMove = (e) => {
        if (!isDrawing) return;
        const rect = e.target.getBoundingClientRect();
        const currentX = e.clientX - rect.left;
        const currentY = e.clientY - rect.top;
        setCurrentBox((prevBox) => ({
            ...prevBox,
            width: currentX - prevBox.x,
            height: currentY - prevBox.y,
        }));
    };

    const handleMouseUp = () => {
        if (isDrawing) {
            setIsDrawing(false);
            setDrawingBoxes((prevBoxes) => [...prevBoxes, currentBox]);
            setCurrentBox(null);
        }
    };

    if (selectedBoxIndex === null || !taggedElements || !taggedElements[selectedBoxIndex]) {
        return null;
    }

    const isImage = taggedElements[selectedBoxIndex].type === 'image';
    return (
        <Modal show={show} onHide={handleClose} size="lg">
            <Modal.Header closeButton>
                <Modal.Title>Edit {isImage ? 'Image' : 'Text Box'}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Form>
                    {isImage ? (
                        <>
                            <Form.Group>
                                <Form.Label>Alt Text</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="altText"
                                    value={boxDetails.altText}
                                    onChange={handleChange}
                                />
                            </Form.Group>
                            <Form.Group>
                                <Form.Check
    type="switch"
    id="contains-table-switch"
    label="Contains a Table?"
    name="containsTable"
    checked={boxDetails.containsTable}
    onChange={handleChange}
                                />
                            </Form.Group>
                            {boxDetails.containsTable && (
                                <div className="pdf-canvas-container">
                                    <canvas
                                        ref={canvasRef}
                                        className="pdf-canvas"
                                        onMouseDown={handleMouseDown}
                                        onMouseMove={handleMouseMove}
                                        onMouseUp={handleMouseUp}
                                    />
                                    {drawingBoxes.map((box, index) => (
                                        <EditableTable
                                            key={index}
                                            initialRows={boxDetails.tables?.length || 3}
                                            initialCols={boxDetails.tables?.[0]?.length || 3}
                                            onTableChange={handleTablesChange}
                                            box={box}
                                        />
                                    ))}
                                    {currentBox && (
                                        <div
                                            className="drawing-box"
                                            style={{
                                                left: currentBox.x,
                                                top: currentBox.y,
                                                width: currentBox.width,
                                                height: currentBox.height,
                                            }}
                                        />
                                    )}
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            <Form.Group>
                                <Form.Label>Box Name</Form.Label>
                                <Form.Control
                                    type="text"
                                    name="name"
                                    value={boxDetails.name}
                                    onChange={handleChange}
                                />
                            </Form.Group>

                            <Form.Group>
                                <Form.Label>Heading Type</Form.Label>
                                <Form.Control
                                    as="select"
                                    name="tag"
                                    value={boxDetails.tag}
                                    onChange={handleChange}
                                >
                                    <option value="Paragraph">Paragraph</option>
                                    <option value="H1">Heading 1</option>
                                    <option value="H2">Heading 2</option>
                                    <option value="H3">Heading 3</option>
                                </Form.Control>
                            </Form.Group>

                            <Form.Group>
                                <Form.Label>Language</Form.Label>
                                <Form.Control
                                    as="select"
                                    name="language"
                                    value={boxDetails.language}
                                    onChange={handleChange}
                                >
                                    {languages.map((lang) => (
                                        <option key={lang.code} value={lang.code}>
                                            {lang.name}
                                        </option>
                                    ))}
                                </Form.Control>
                            </Form.Group>

                            <Form.Group>
                                <Form.Label>Font</Form.Label>
                                <Form.Control
                                    as="select"
                                    name="font"
                                    value={boxDetails.font}
                                    onChange={handleChange}
                                >
                                    {fonts.map((font, index) => (
                                        <option key={index} value={font.base64}>
                                            {font.name}
                                        </option>
                                    ))}
                                </Form.Control>
                            </Form.Group>
                        </>
                    )}
                </Form>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={handleClose}>Cancel</Button>
                <Button variant="primary" onClick={handleSave}>Save Changes</Button>
            </Modal.Footer>
        </Modal>
    );
};

export default EditBoxModal;