import React from 'react';

const TaggedElement = ({ box, handleBoxClick }) => {
    let backgroundColor = 'rgba(0, 0, 0, 0.3)';
    if (box.tag === 'H1') backgroundColor = 'rgba(255, 0, 0, 0.3)';
    if (box.tag === 'H2') backgroundColor = 'rgba(0, 255, 0, 0.3)';
    if (box.tag === 'H3') backgroundColor = 'rgba(0, 0, 255, 0.3)';
    if (box.type === 'image') backgroundColor = 'rgba(255, 255, 0, 0.3)';

    return (
        <div
            onClick={handleBoxClick}
            style={{
                position: 'absolute',
                top: `${box.y}px`,
                left: `${box.x}px`,
                width: `${box.width}px`,
                height: `${box.height}px`,
                backgroundColor,
                border: '1px solid black',
                zIndex: 2,
                cursor: 'pointer',
            }}
        >
            {box.name} ({box.tag})
        </div>
    );
};

export default TaggedElement;
