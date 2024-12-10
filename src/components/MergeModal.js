import React from 'react';
import { Modal, Button } from 'react-bootstrap';

const MergeModal = ({ show, handleClose, mergeCandidate, setTaggedElements }) => {
    const handleMerge = () => {
        const { newBox, overlappingBoxes } = mergeCandidate;

        // Create a merged box by encompassing all overlapping boxes
        const minX = Math.min(newBox.x, ...overlappingBoxes.map(box => box.x));
        const minY = Math.min(newBox.y, ...overlappingBoxes.map(box => box.y));
        const maxX = Math.max(newBox.x + newBox.width, ...overlappingBoxes.map(box => box.x + box.width));
        const maxY = Math.max(newBox.y + newBox.height, ...overlappingBoxes.map(box => box.y + box.height));

        const mergedBox = {
            ...newBox,
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY
        };

        // Update the taggedElements state
        setTaggedElements(prev =>
            prev.filter(box => !overlappingBoxes.includes(box)).concat(mergedBox)
        );

        handleClose();
    };

    return (
        <Modal show={show} onHide={handleClose}>
            <Modal.Header closeButton>
                <Modal.Title>Merge Boxes</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <p>Do you want to merge the newly created box with the overlapping ones?</p>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={handleClose}>
                    Cancel
                </Button>
                <Button variant="primary" onClick={handleMerge}>
                    Merge
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default MergeModal;
