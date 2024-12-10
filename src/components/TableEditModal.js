import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import * as pdfjsLib from 'pdfjs-dist';
import EditableTable from './EditableTable';
import _ from 'lodash';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.entry';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const TableEditModal = ({ isOpen, tableData, onClose, onTableChange, pdfDoc }) => {
    const [updatedTableData, setUpdatedTableData] = useState(null);
    const canvasRef = useRef(null);

    useEffect(() => {
        if (isOpen && tableData) {
            setUpdatedTableData({
                ...tableData,
                multipage: tableData.multipage || false, // Default to false if undefined
            });
        }
    }, [isOpen, tableData]);

    useEffect(() => {
        if (isOpen && pdfDoc && canvasRef.current) {
            renderCroppedPdfToCanvas();
        }
    }, [isOpen, pdfDoc, tableData]);

    const renderCroppedPdfToCanvas = async () => {
        if (!pdfDoc || !canvasRef.current) return;

        try {
            const canvas = canvasRef.current;
            const context = canvas.getContext('2d');
            context.clearRect(0, 0, canvas.width, canvas.height);

            const page = await pdfDoc.getPage(tableData.page);
            const scale = 1.5;
            const viewport = page.getViewport({ scale });

            const cropX = tableData.x * scale;
            const cropY = tableData.y * scale;
            const cropWidth = tableData.width * scale;
            const cropHeight = tableData.height * scale;

            canvas.width = cropWidth;
            canvas.height = cropHeight;

            const renderContext = {
                canvasContext: context,
                viewport: viewport,
                transform: [scale, 0, 0, scale, -cropX, -cropY],
            };

            await page.render(renderContext).promise;
        } catch (error) {
            console.error('Error rendering cropped PDF to canvas:', error);
        }
    };

    const handleTableChange = useCallback(
        (newData) => {
            setUpdatedTableData((prev) => ({
                ...prev,
                ...newData,
            }));
        },
        [] // Dependency array remains empty as it's memoized
    );

    const handleMultipageToggle = () => {
        setUpdatedTableData((prev) => ({
            ...prev,
            multipage: !prev.multipage, // Toggle the multipage flag
        }));
    };

    const handleSaveClick = () => {
        if (updatedTableData) {
            onTableChange(updatedTableData);
        }
        onClose();
    };

    if (!isOpen || !tableData) return null;

    return (
        <Modal show={isOpen} onHide={onClose} size="lg">
            <Modal.Header closeButton>
                <Modal.Title>Edit Table Structure</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <div
                    style={{
                        position: 'relative',
                        border: '1px solid black',
                        width: `${tableData.width}px`,
                        height: `${tableData.height}px`,
                    }}
                >
                    <canvas
                        ref={canvasRef}
                        style={{
                            width: '100%',
                            height: '100%',
                            pointerEvents: 'none',
                        }}
                    />
                    <div
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                        }}
                    >
                        {updatedTableData && (
                            <EditableTable
                                initialRows={updatedTableData.rowPositions?.length || 2}
                                initialCols={updatedTableData.colPositions?.length || 2}
                                onTableChange={handleTableChange}
                                box={{
                                    height: updatedTableData.height || 300,
                                    width: updatedTableData.width || 400,
                                }}
                            />
                        )}
                    </div>
                </div>
            </Modal.Body>
            <Modal.Footer>
                <Form.Check
                    type="switch"
                    id="multipage-switch"
                    label="Multipage"
                    checked={updatedTableData?.multipage || false}
                    onChange={handleMultipageToggle}
                />
                <Button variant="secondary" onClick={onClose}>
                    Cancel
                </Button>
                <Button variant="primary" onClick={handleSaveClick}>
                    Save Changes
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default TableEditModal;
