import React from 'react';

const BoxMorpher = ({ taggedElements, setTaggedElements, generateUniqueId }) => {
    const doBoxesOverlap = (box1, box2) => {
        return (
            box1.x < box2.x + box2.width &&
            box1.x + box1.width > box2.x &&
            box1.y < box2.y + box2.height &&
            box1.y + box1.height > box2.y
        );
    };

    const mergeBoundingBoxes = (boxes) => {
        const xMin = Math.min(...boxes.map((box) => box.x));
        const yMin = Math.min(...boxes.map((box) => box.y));
        const xMax = Math.max(...boxes.map((box) => box.x + box.width));
        const yMax = Math.max(...boxes.map((box) => box.y + box.height));

        return {
            id: generateUniqueId("merged"),
            type: "merged",
            x: xMin,
            y: yMin,
            width: xMax - xMin,
            height: yMax - yMin,
            page: boxes[0].page,
            children: boxes,
        };
    };


    const flattenElementsForMerge = (elements) => {
        return elements.flatMap((element) =>
          element.type === 'section' ? element.children : element
        );
      };

    const morphBoxes = (newBox) => {
        const flatElements = flattenElementsForMerge(taggedElements);
        const overlappingBoxes = flatElements.filter((box) => doBoxesOverlap(box, newBox));
      
        if (overlappingBoxes.length > 0) {
          const mergedBox = mergeBoundingBoxes([newBox, ...overlappingBoxes]);
          setTaggedElements((prevElements) =>
            prevElements.filter((box) => !overlappingBoxes.includes(box)).concat(mergedBox)
          );
        } else {
          setTaggedElements((prev) => [...prev, newBox]);
        }
      };

    return { morphBoxes, doBoxesOverlap };
};

export default BoxMorpher;
