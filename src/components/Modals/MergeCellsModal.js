import React, { useState } from 'react';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';

const MergeCellsModal = ({ selectedCell, data, onSave, onCancel }) => {
  const [mergedData, setMergedData] = useState([]);

  const handleMerge = () => {
    // Example merging logic: combine selected cell with adjacent cells
    const newMergedData = [
      ...mergedData,
      {
        row: selectedCell.rowIndex,
        col: selectedCell.colIndex,
        value: 'Merged Cell', // Replace with logic to combine values
      },
    ];
    setMergedData(newMergedData);
    onSave(newMergedData);
  };

  return (
    <Modal show onHide={onCancel}>
      <Modal.Header closeButton>
        <Modal.Title>Merge Cells</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>
          Select the range of cells to merge. Currently selected cell: Row{' '}
          {selectedCell?.rowIndex + 1}, Column {selectedCell?.colIndex + 1}.
        </p>
        {/* Add additional UI for selecting a range if needed */}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleMerge}>
          Merge
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default MergeCellsModal;
