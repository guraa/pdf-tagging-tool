import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import EditableTable from './EditableTable';
import _ from 'lodash';

const TaggingModal = ({
    show,
    handleClose,
    handleSave,
    languages = [],
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
    const [selectedFont, setSelectedFont] = useState('');
    const [altText, setAltText] = useState('');
    const canvasRef = useRef(null);

    // Render selected area on canvas
    const renderSelectedArea = useCallback(async () => {
        if (!pdfDoc || !canvasRef.current || !selectedBox) return;

        try {
            const canvas = canvasRef.current;
            const context = canvas.getContext('2d');
            context.clearRect(0, 0, canvas.width, canvas.height);

            const page = await pdfDoc.getPage(selectedBox.page);
            const scale = 1.5;
            const viewport = page.getViewport({ scale });

            const cropX = selectedBox.x * scale;
            const cropY = selectedBox.y * scale;
            const cropWidth = selectedBox.width * scale;
            const cropHeight = selectedBox.height * scale;

            canvas.width = cropWidth;
            canvas.height = cropHeight;

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

    const handleSaveClick = () => {
        console.log('Box details:', boxDetails);
        if (boxDetails.containsTable) {
            setHeadingType('table')
            handleSave({
                type: 'table', // Set type as table if it contains a table
                tag: 'table',
                rowCount,
                colCount,
                tables: boxDetails.tables,
            });
        } else {
            handleSave({
                type: 'text',
                name: boxDetails.name,
                tag: boxDetails.tag,
                language: boxDetails.language,
                font: selectedFont,
                altText: boxDetails.altText,
            });
        }
        handleClose();
    };
    // Handle font selection
    const handleFontSelect = (fontBase64) => {
        const font = fonts.find((f) => f.base64 === fontBase64);
        setSelectedFont(font ? { name: font.name, base64: font.base64 } : {});
    };

    const handleTableChange = (newTableData) => {
        setBoxDetails((prev) => {
            if (_.isEqual(prev.tables, newTableData)) {
                return prev; // Skip updating state if data is unchanged
            }
            return {
                ...prev,
                tables: newTableData,
            };
        });
    };

    useEffect(() => {
        if (selectedBox) {
            setBoxDetails((prevDetails) => {
                const newDetails = {
                    name: selectedBox.name || '',
                    tag: selectedBox.containsTable ? 'table' : (selectedBox.tag || 'Paragraph'),
                    language: selectedBox.language || 'sv',
                    font: selectedBox.font || '',
                    altText: selectedBox.altText || '',
                    containsTable: selectedBox.containsTable || false,
                    tables: selectedBox.tables || [],
                    type: selectedBox.containsTable ? 'table' : (selectedBox.type || 'text'), // Ensure type is set correctly
                };
    
                // Only update state if there are actual changes
                if (
                    prevDetails.name !== newDetails.name ||
                    prevDetails.tag !== newDetails.tag ||
                    prevDetails.language !== newDetails.language ||
                    prevDetails.font !== newDetails.font ||
                    prevDetails.altText !== newDetails.altText ||
                    prevDetails.containsTable !== newDetails.containsTable ||
                    prevDetails.tables !== newDetails.tables ||
                    prevDetails.type !== newDetails.type
                ) {
                    return newDetails;
                }
                return prevDetails;
            });
        }
    }, [selectedBox]);

    useEffect(() => {
        if (show && boxDetails.containsTable) {
            renderSelectedArea();
        }
    }, [show, boxDetails.containsTable]);

    return (
        <Modal show={show} onHide={handleClose} size="lg" backdrop="static">
            <Modal.Header closeButton>
                <Modal.Title>{isAltText ? 'Set Alt Text' : 'Tag Element'}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Form>
                    {isAltText ? (
                        <Form.Group>
                            <Form.Label>Alt Text</Form.Label>
                            <Form.Control
                                type="text"
                                value={altText}
                                onChange={(e) => setAltText(e.target.value)}
                            />
                        </Form.Group>
                    ) : (
                        <>
                            <Form.Group>
                                <Form.Label>Box Name</Form.Label>
                                <Form.Control
                                    type="text"
                                    value={boxDetails.name}
                                    onChange={(e) =>
                                        setBoxDetails((prev) => ({
                                            ...prev,
                                            name: e.target.value,
                                        }))
                                    }
                                />
                            </Form.Group>

                            <Form.Group>
                                <Form.Label>Contains Table</Form.Label>
                                <Form.Check
    type="switch"
    id="table-switch"
    label={boxDetails.containsTable ? 'Yes' : 'No'}
    checked={boxDetails.containsTable}
    onChange={() =>
        setBoxDetails((prev) => ({
            ...prev,
            containsTable: !prev.containsTable,
            tag: !prev.containsTable ? 'table' : 'Paragraph', // Set tag to 'table' or fallback to 'Paragraph'
            type: !prev.containsTable ? 'table' : 'text', // Add type field for clarity
        }))
    }
/>
                            </Form.Group>

                            {boxDetails.containsTable && (
                                <div style={{ marginBottom: '20px', position: 'relative' }}>
                                    <canvas
                                        ref={canvasRef}
                                        style={{
                                            width: `${selectedBox?.width || 400}px`,
                                            height: `${selectedBox?.height || 300}px`,
                                            border: '1px solid black',
                                            marginBottom: '10px',
                                        }}
                                    />
                                    <EditableTable
                                        initialRows={rowCount || 3}
                                        initialCols={colCount || 3}
                                        onTableChange={handleTableChange}
                                        box={{
                                            height: selectedBox?.height || 300,
                                            width: selectedBox?.width || 400,
                                        }}
                                    />
                                </div>
                            )}

                            {!boxDetails.containsTable && (
                                <>
                                    <Form.Group>
                                        <Form.Label>Heading Type</Form.Label>
                                        <Form.Control
                                            as="select"
                                            value={headingType}
                                            onChange={(e) => setHeadingType(e.target.value)}
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
                                            value={language}
                                            onChange={(e) => setLanguage(e.target.value)}
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
                                            value={selectedFont.base64 || ''}
                                            onChange={(e) => handleFontSelect(e.target.value)}
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
                        </>
                    )}
                </Form>
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
