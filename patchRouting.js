const fs = require('fs');
const path = 'lib/components/HintBox.tsx';
let content = fs.readFileSync(path, 'utf8');

const newCode = `      // Starting point logic
      const startX = hLayout.pageX - containerLayout.pageX + (isFront ? 0 : hLayout.width) + 1000;
      const startY = hLayout.pageY - containerLayout.pageY + (hLayout.height / 2) + 1000;
      
      // Target bounding box logic
      const tLeft = tLayout.pageX - containerLayout.pageX + 1000;
      const tRight = tLeft + tLayout.width;
      const tCenter = tLeft + tLayout.width / 2;
      const tTop = tLayout.pageY - containerLayout.pageY + 1000;
      const tBottom = tTop + tLayout.height;
      const tCenterY = tTop + tLayout.height / 2;

      let waypoints: {x: number, y: number}[] = [{x: startX, y: startY}];

      let destX = 0, destY = 0;
      let finalDirX = 0, finalDirY = 0;

      // 1. If component is vertically aligned (close to the same x-dimension)
      if (Math.abs(tCenter - startX) < (tLayout.width / 2 + 40)) {
        const isTargetAbove = tCenterY < startY;
        destX = tCenter;
        destY = isTargetAbove ? tBottom + 8 : tTop - 8;
        finalDirX = 0;
        finalDirY = isTargetAbove ? -1 : 1;
        
        // Go horizontally straight to tCenter, then vertically to the target.
        // This ensures the vertical line perfectly aligns with the arrowhead.
        waypoints.push({ x: destX, y: startY });
        waypoints.push({ x: destX, y: destY });
      } else {
        // Extend horizontally outside the hintbox by the distance to the edge
        let distToEdge = isFront ? (startX - 1000) : (1000 + containerLayout.width - startX);
        distToEdge = Math.max(distToEdge, 10);
        const midX = isFront ? (1000 - distToEdge) : (1000 + containerLayout.width + distToEdge);

        // 2 & 3. Horizontal routing (Standard or Wrap-around)
        const isTargetRight = tCenter > startX;
        destX = isTargetRight ? tLeft - 8 : tRight + 8;
        destY = tCenterY;
        finalDirX = isTargetRight ? 1 : -1;
        finalDirY = 0;

        waypoints.push({ x: midX, y: startY });
        waypoints.push({ x: midX, y: destY });
        waypoints.push({ x: destX, y: destY });
      }`;

const startMarker = `      // Starting point logic`;
const endMarker = `      let pathStr = buildRoundedPath(waypoints, 15);`;

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
  content = content.substring(0, startIndex) + newCode + '\n\n' + content.substring(endIndex);
  fs.writeFileSync(path, content);
  console.log('Patched HintBox routing perfectly');
} else {
  console.error('Could not find markers');
}
