import React, { useState, useRef } from 'react';
import TableCanvas from './TableCanvas';
import Toolbar from './Toolbar'; // This is the Toolbar component with glyphs

const DrawingTool = ({ tableData = [], onTableSave }) => {
    const [drawingMode, setDrawingMode] = useState('text'); // Default drawing mode
    const canvasRef = useRef(null);

    const handleModeChange = (mode) => {
        setDrawingMode(mode);
    };

    return (
        <div>
            {/* Toolbar for switching between text and table modes */}
            <Toolbar onModeChange={handleModeChange} />

            {/* Canvas area with table and text drawing capabilities */}
            <div style={{ border: '1px solid black', position: 'relative', width: '100%', height: '500px' }}>
                <TableCanvas
                    tableData={tableData}
                    onTableSave={onTableSave}
                    canvasRef={canvasRef}
                    drawingMode={drawingMode}
                />
            </div>
        </div>
    );
};

export default DrawingTool;
