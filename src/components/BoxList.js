import React, { useState } from 'react';
import ConfirmDeleteModal from './Modals/ConfirmDeleteModal';

const BoxList = ({ boxes, setTaggedElements }) => {
  const [boxToDelete, setBoxToDelete] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const handleRemoveBox = (box) => {
    setBoxToDelete(box);
    setShowConfirmModal(true);
  };

  const confirmRemoveBox = () => {
    if (boxToDelete) {
      setTaggedElements((prev) => prev.filter((box) => box.id !== boxToDelete.id));
      setShowConfirmModal(false);
      setBoxToDelete(null);
    }
  };

  return (
    <>
      {boxes.map((box, index) => (
        <div key={index} style={{ marginBottom: "10px" }}>
          {box.name} ({box.tag})
          <button
            onClick={() => handleRemoveBox(box)}
            style={{
              marginLeft: "10px",
              backgroundColor: "white",
              color: "black",
              border: "1px solid black",
              borderRadius: "3px",
              width: "24px",
              height: "24px",
              fontSize: "16px",
              cursor: "pointer",
            }}
          >
            ×
          </button>
        </div>
      ))}

      {/* Reusable ConfirmDeleteModal */}
      <ConfirmDeleteModal
        show={showConfirmModal}
        handleClose={() => setShowConfirmModal(false)}
        handleConfirm={confirmRemoveBox}
        boxName={boxToDelete?.name}
      />
    </>
  );
};

export default BoxList;
