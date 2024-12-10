import React, { useState, useEffect, useCallback } from 'react';
import { Rnd } from 'react-rnd';
import 'font-awesome/css/font-awesome.min.css';
import _ from 'lodash';

const EditableTable = ({ initialRows = 3, initialCols = 3, onTableChange, box }) => {
    const [rows, setRows] = useState(null);
    const [cols, setCols] = useState(null);
    const [dimensions, setDimensions] = useState({ width: box.width, height: box.height });

    // Initialize rows and columns only once
    useEffect(() => {
        if (rows === null && cols === null) {
            setRows(Array(initialRows).fill(box.height / initialRows));
            setCols(Array(initialCols).fill(box.width / initialCols));
        }
    }, [rows, cols, initialRows, initialCols, box.height, box.width]);

    const updateTableData = useCallback(() => {
        if (!rows || !cols) return;

        const rowPositions = rows.reduce(
            (acc, height, idx) => [...acc, (acc[idx - 1] || 0) + height],
            []
        );
        const colPositions = cols.reduce(
            (acc, width, idx) => [...acc, (acc[idx - 1] || 0) + width],
            []
        );

        const updatedTableData = {
            rowCount: rows.length,
            colCount: cols.length,
            rowPositions,
            colPositions,
        };

        console.log('EditableTable updateTableData:', updatedTableData);
        onTableChange(updatedTableData);
    }, [rows, cols, onTableChange]);

    // Ensure table updates on rows/cols changes
    useEffect(() => {
        updateTableData();
    }, [rows, cols, updateTableData]);

    const handleResizeRow = (rowIndex, deltaHeight) => {
        setRows((prev) => {
            const updatedRows = [...prev];
            const newHeight = Math.max(updatedRows[rowIndex] + deltaHeight, 10);
            const heightDiff = updatedRows[rowIndex] - newHeight;

            updatedRows[rowIndex] = newHeight;
            if (rowIndex < updatedRows.length - 1) {
                updatedRows[rowIndex + 1] += heightDiff;
            }
            return updatedRows;
        });
    };

    const handleResizeCol = (colIndex, deltaWidth) => {
        setCols((prev) => {
            const updatedCols = [...prev];
            const newWidth = Math.max(updatedCols[colIndex] + deltaWidth, 10);
            const widthDiff = updatedCols[colIndex] - newWidth;

            updatedCols[colIndex] = newWidth;
            if (colIndex < updatedCols.length - 1) {
                updatedCols[colIndex + 1] += widthDiff;
            }
            return updatedCols;
        });
    };

    const handleAddRow = (e) => {
        e.preventDefault(); 
        setRows((prev) => {
            const totalHeight = dimensions.height;
            return [...prev, totalHeight / (prev.length + 1)].map(() => totalHeight / (prev.length + 1));
        });
    };
    
    const handleAddCol = (e) => {
        e.preventDefault();
        setCols((prev) => {
            const totalWidth = dimensions.width;
            return [...prev, totalWidth / (prev.length + 1)].map(() => totalWidth / (prev.length + 1));
        });
    };
    
    const handleRemoveRow = (e) => {
        e.preventDefault(); 
        setRows((prev) => {
            if (prev.length > 1) {
                return prev.slice(0, -1);
            }
            return prev;
        });
    };
    
    const handleRemoveCol = (e) => {
        e.preventDefault(); 
        setCols((prev) => {
            if (prev.length > 1) {
                return prev.slice(0, -1);
            }
            return prev;
        });
    };
    

    const handleMouseDownRow = (rowIndex, startY) => {
        const handleMouseMove = (event) => {
            const deltaHeight = event.clientY - startY;
            handleResizeRow(rowIndex, deltaHeight);
            startY = event.clientY;
        };
        const handleMouseUp = () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            updateTableData();
        };
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };

    const handleMouseDownCol = (colIndex, startX) => {
        const handleMouseMove = (event) => {
            const deltaWidth = event.clientX - startX;
            handleResizeCol(colIndex, deltaWidth);
            startX = event.clientX;
        };
        const handleMouseUp = () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            updateTableData();
        };
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };

    return (
        <Rnd
            bounds="parent"
            default={{
                x: box.x,
                y: box.y,
                width: box.width,
                height: box.height,
            }}
            size={{ width: dimensions.width, height: dimensions.height }}
            onResize={(e, dir, ref) => setDimensions({ width: ref.offsetWidth, height: ref.offsetHeight })}
            style={{
                position: 'absolute',
                border: '1px solid red',
                overflow: 'visible',
            }}
            disableDragging
            enableResizing={{
                bottom: true,
                right: true,
                bottomRight: true,
            }}
        >
            <div
                style={{
                    position: 'absolute',
                    left: '-50px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    display: 'flex',
                    flexDirection: 'column',
                    zIndex: 10,
                }}
            >
                <button onClick={handleAddRow} style={{ marginBottom: '5px' }}>+</button>
                <button onClick={handleRemoveRow}>-</button>
            </div>
            <div
                style={{
                    position: 'absolute',
                    top: '-50px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    display: 'flex',
                    gap: '10px',
                    zIndex: 10,
                }}
            >
                <button onClick={handleAddCol}>+</button>
                <button onClick={handleRemoveCol}>-</button>
            </div>

            <div
                style={{
                    display: 'grid',
                    gridTemplateRows: rows?.map((height) => `${height}px`).join(' ') || '',
                    gridTemplateColumns: cols?.map((width) => `${width}px`).join(' ') || '',
                    width: '100%',
                    height: '100%',
                    position: 'relative',
                }}
            >
                {rows?.map((_, rowIndex) =>
                    cols?.map((_, colIndex) => (
                        <div
                            key={`${rowIndex}-${colIndex}`}
                            style={{
                                border: '1px solid black',
                                position: 'relative',
                                boxSizing: 'border-box',
                            }}
                        >
                            {rowIndex < rows.length - 1 && (
                                <div
                                    style={{
                                        position: 'absolute',
                                        bottom: 0,
                                        left: 0,
                                        width: '100%',
                                        height: '5px',
                                        cursor: 'ns-resize',
                                    }}
                                    onMouseDown={(e) => handleMouseDownRow(rowIndex, e.clientY)}
                                />
                            )}
                            {colIndex < cols.length - 1 && (
                                <div
                                    style={{
                                        position: 'absolute',
                                        top: 0,
                                        right: 0,
                                        width: '5px',
                                        height: '100%',
                                        cursor: 'ew-resize',
                                    }}
                                    onMouseDown={(e) => handleMouseDownCol(colIndex, e.clientX)}
                                />
                            )}
                        </div>
                    ))
                )}
            </div>
        </Rnd>
    );
};

export default EditableTable;
