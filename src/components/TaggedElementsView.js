import React, { memo } from 'react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import { Badge } from 'react-bootstrap';
import { FaTimes, FaGripVertical } from 'react-icons/fa';

const getBadgeVariant = (type) => {
  switch (type) {
    case 'H1':
      return 'danger';
    case 'H2':
      return 'success';
    case 'H3':
      return 'primary';
    case 'image':
      return 'warning';
    default:
      return 'secondary';
  }
};

const getIndentation = (type) => {
  switch (type) {
    case 'H1':
      return '0px';
    case 'H2':
      return '20px';
    case 'H3':
      return '40px';
    default:
      return '60px';
  }
};



const TaggedElementsView = memo(({ taggedElements, setTaggedElements }) => {
  const removeTaggedElement = (sectionIndex, childIndex) => {
      setTaggedElements((prevElements) => {
          const newElements = [...prevElements];
          if (typeof childIndex !== 'undefined') {
              newElements[sectionIndex].children.splice(childIndex, 1);
          } else {
              newElements.splice(sectionIndex, 1);
          }
          return newElements;
      });
  };

  return (
    <>
      <Droppable droppableId="sections" type="SECTION">
                {(provided) => (
                    <div ref={provided.innerRef} {...provided.droppableProps}>
                        {taggedElements
                            .filter((section) => section.type === 'section')
                            .map((section, sectionIndex) => {
                                // Generate unique keys based on id and fallback to index if id is missing
                                const sectionKey = section.id ? `section-${section.id}` : `section-index-${sectionIndex}`;
                                return (
                                    <Draggable
                                        key={sectionKey}  // Use unique key for section
                                        draggableId={sectionKey}  // Unique draggableId
                                        index={sectionIndex}
                                    >
                                        {(provided) => (
                                            <div
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                className="mb-3 alert alert-primary"
                                            >
                                                <div {...provided.dragHandleProps} style={{ display: 'flex', alignItems: 'center' }}>
                                                    <FaGripVertical style={{ marginRight: '8px', cursor: 'grab' }} />
                                                    <h5 style={{ margin: 0 }}>{section.name}</h5>
                                                </div>
                                                <Droppable droppableId={sectionKey} type="ITEM">
                                                    {(provided) => (
                                                        <div
                                                            ref={provided.innerRef}
                                                            {...provided.droppableProps}
                                                            style={{
                                                                padding: '10px',
                                                                backgroundColor: '#f0f8ff',
                                                                borderRadius: '8px',
                                                                minHeight: '50px',
                                                            }}
                                                        >
                                                            {section.children.map((child, childIndex) => {
                                                                const childKey = child.id ? `child-${child.id}` : `child-index-${childIndex}`;
                                                                return (
                                                                    <Draggable
                                                                        key={childKey}  // Ensure unique key for child
                                                                        draggableId={childKey}  // Ensure unique draggableId for child
                                                                        index={childIndex}
                                                                    >
                                                                        {(provided) => (
                                                                            <div
                                                                                ref={provided.innerRef}
                                                                                {...provided.draggableProps}
                                                                                {...provided.dragHandleProps}
                                                                                className="mb-2 d-flex align-items-center"
                                                                            >
                                                                                <Badge pill variant={getBadgeVariant(child.tag)}>
                                                                                    {child.tag} - {child.name}
                                                                                </Badge>
                                                                                <FaTimes
                                                                                    onClick={() => removeTaggedElement(sectionIndex, childIndex)}
                                                                                    style={{ marginLeft: '8px', cursor: 'pointer', color: 'red' }}
                                                                                />
                                                                            </div>
                                                                        )}
                                                                    </Draggable>
                                                                );
                                                            })}
                                                            {provided.placeholder}
                                                        </div>
                                                    )}
                                                </Droppable>
                                            </div>
                                        )}
                                    </Draggable>
                                );
                            })}
                        {provided.placeholder}
                    </div>
                )}
            </Droppable>

            <Droppable droppableId="ungrouped-items" type="ITEM">
                {(provided) => (
                    <div ref={provided.innerRef} {...provided.droppableProps} className="mt-3">
                        <h6>Ungrouped Items</h6>
                        <div style={{ padding: '10px', border: '1px dashed #ccc', minHeight: '50px' }}>
                            {taggedElements
                                .filter((item) => item.type !== 'section')
                                .map((element, index) => {
                                    const elementKey = element.id ? `element-${element.id}` : `element-index-${index}`;
                                    return (
                                        <Draggable
                                            key={elementKey}  // Unique key for ungrouped item
                                            draggableId={elementKey}  // Unique draggableId
                                            index={index}
                                        >
                                            {(provided) => (
                                                <div
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    {...provided.dragHandleProps}
                                                    className="mb-2 d-flex align-items-center"
                                                >
                                                    <Badge pill variant={getBadgeVariant(element.tag)}>
                                                        {element.tag} - {element.name}
                                                    </Badge>
                                                    <FaTimes
                                                        onClick={() => removeTaggedElement(index)}
                                                        style={{ marginLeft: '8px', cursor: 'pointer', color: 'red' }}
                                                    />
                                                </div>
                                            )}
                                        </Draggable>
                                    );
                                })}
                            {provided.placeholder}
                        </div>
                    </div>
                )}
            </Droppable>
        </>
    );
});


export default TaggedElementsView;
