import React from "react";

const TextBlockSelector = ({ pdfDoc, setTaggedElements }) => {
  const handleAutoSelectText = async () => {
    if (!pdfDoc) {
      alert("Please load a PDF first.");
      return;
    }

    const textBlocks = await extractTextBlocksFromPdf(pdfDoc);
    setTaggedElements((prev) => [...prev, ...textBlocks]);
  };

  const extractTextBlocksFromPdf = async (pdfDoc) => {
    const textBlocks = [];

    for (let i = 1; i <= pdfDoc.numPages; i++) {
      const page = await pdfDoc.getPage(i);
      const viewport = page.getViewport({ scale: 1.5 });
      const textContent = await page.getTextContent();

      // Group text items into blocks
      const blocks = groupTextIntoBlocks(textContent.items, viewport);

      // Generate bounding boxes for each block
      const blockBoxes = blocks.map((block) =>
        generateBoundingBox(block, viewport, i)
      );

      textBlocks.push(...blockBoxes);
    }

    return textBlocks;
  };

  const groupTextIntoBlocks = (textItems, viewport) => {
    const blocks = [];
    const threshold = 5; // Proximity threshold (in viewport units)

    textItems.forEach((item) => {
      const [a, b, c, d, e, f] = item.transform;
      const x = e * viewport.scale;
      const y = viewport.height - f * viewport.scale;
      const width = item.width * viewport.scale;
      const height = Math.abs(d) * viewport.scale;

      // Try to find an existing block to merge this item into
      let added = false;
      for (const block of blocks) {
        if (isItemCloseToBlock({ x, y, width, height }, block, threshold)) {
          block.items.push({ x, y, width, height, str: item.str });
          added = true;
          break;
        }
      }

      // If no suitable block is found, create a new one
      if (!added) {
        blocks.push({ items: [{ x, y, width, height, str: item.str }] });
      }
    });

    return blocks;
  };

  const isItemCloseToBlock = (item, block, threshold) => {
    const blockBounds = block.items.reduce(
      (bounds, { x, y, width, height }) => ({
        minX: Math.min(bounds.minX, x),
        maxX: Math.max(bounds.maxX, x + width),
        minY: Math.min(bounds.minY, y - height), // Adjust for alignment
        maxY: Math.max(bounds.maxY, y),
      }),
      { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }
    );

    const isCloseHorizontally =
      item.x < blockBounds.maxX + threshold &&
      item.x + item.width > blockBounds.minX - threshold;
    const isCloseVertically =
      item.y < blockBounds.maxY + threshold &&
      item.y + item.height > blockBounds.minY - threshold;

    return isCloseHorizontally && isCloseVertically;
  };

  const generateBoundingBox = (block, viewport, page) => {
    const bounds = block.items.reduce(
      (acc, { x, y, width, height }) => ({
        minX: Math.min(acc.minX, x),
        maxX: Math.max(acc.maxX, x + width),
        minY: Math.min(acc.minY, y - height), // Align top
        maxY: Math.max(acc.maxY, y), // Use baseline for maxY
      }),
      { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }
    );

    return {
      type: "text",
      name: "Text Block",
      x: bounds.minX,
      y: bounds.minY, // Adjusted for alignment
      width: bounds.maxX - bounds.minX,
      height: bounds.maxY - bounds.minY,
      page,
    };
  };

  return (
    <button className="btn btn-info" onClick={handleAutoSelectText}>
      <i className="fas fa-text-height mr-2"></i> Auto Select Text Blocks
    </button>
  );
};

export default TextBlockSelector;
