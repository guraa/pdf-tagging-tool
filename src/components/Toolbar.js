import React, { useState } from 'react';
import { ButtonGroup, Button } from 'react-bootstrap';

const Toolbar = ({ onModeChange }) => {
    const [activeMode, setActiveMode] = useState('text'); // Default to text mode

    const handleModeChange = (mode) => {
        setActiveMode(mode);
        onModeChange(mode);
    };

    return (
        <ButtonGroup>
            <Button
                variant={activeMode === 'text' ? 'primary' : 'outline-primary'}
                onClick={() => handleModeChange('text')}
            >
                <i className="fas fa-font"></i> Text
            </Button>
            <Button
                variant={activeMode === 'table' ? 'primary' : 'outline-primary'}
                onClick={() => handleModeChange('table')}
            >
                <i className="fas fa-table"></i> Table
            </Button>
        </ButtonGroup>
    );
};

export default Toolbar;
