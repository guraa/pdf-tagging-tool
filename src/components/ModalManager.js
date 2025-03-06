import React from 'react';
import TaggingModal from './Modals/TaggingModal';
import MergeModal from './Modals/MergeModal';
import EditBoxModal from './Modals/EditBoxModal';
import TableEditModal from './Modals/TableEditModal';

/**
 * ModalManager - Centralized management of all application modals
 * 
 * This component handles showing/hiding all application modals and passes
 * the required props to each modal component.
 */
const ModalManager = ({
  modalState,
  setModalState,
  taggingModalProps,
  mergeModalProps,
  editBoxModalProps,
  tableEditModalProps,
}) => {
  // Close all modals helper function
  const closeAllModals = () => {
    setModalState({
      taggingModal: false,
      mergeModal: false,
      editBoxModal: false,
      tableEditModal: false,
    });
  };

  // Individual modal close handlers
  const handleCloseTaggingModal = () => {
    setModalState(prev => ({ ...prev, taggingModal: false }));
  };

  const handleCloseMergeModal = () => {
    setModalState(prev => ({ ...prev, mergeModal: false }));
  };

  const handleCloseEditBoxModal = () => {
    setModalState(prev => ({ ...prev, editBoxModal: false }));
  };

  const handleCloseTableEditModal = () => {
    setModalState(prev => ({ ...prev, tableEditModal: false }));
  };

  return (
    <>
      {/* Element Tagging Modal */}
      <TaggingModal
        show={modalState.taggingModal}
        handleClose={handleCloseTaggingModal}
        {...taggingModalProps}
      />

      {/* Box Merge Confirmation Modal */}
      <MergeModal
        show={modalState.mergeModal}
        handleClose={handleCloseMergeModal}
        {...mergeModalProps}
        onMergeComplete={() => {
          // Close the merge modal after completing the merge
          handleCloseMergeModal();
          // Also close the tagging modal if it was open
          handleCloseTaggingModal();
        }}
      />

      {/* Box Edit Modal (for editing existing boxes) */}
      <EditBoxModal
        show={modalState.editBoxModal}
        handleClose={handleCloseEditBoxModal}
        {...editBoxModalProps}
      />

      {/* Table Edit Modal */}
      <TableEditModal
        isOpen={modalState.tableEditModal}
        onClose={handleCloseTableEditModal}
        {...tableEditModalProps}
      />
    </>
  );
};

export default ModalManager;