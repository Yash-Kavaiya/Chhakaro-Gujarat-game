import * as THREE from 'three';

export interface HighwayTextureOptions {
  type: 'national' | 'expressway' | 'state';
  width: number;
  repeatLengthMeters?: number;
}

export class RoadTextureGenerator {
  private static textureCache = new Map<string, THREE.CanvasTexture>();

  /**
   * Generates a high-definition repeating asphalt texture with crisp painted lane markings,
   * dashed center lines, solid white shoulder fog lines, rumble notches, and cat's eyes.
   */
  public static getHighwayTexture(options: HighwayTextureOptions): THREE.CanvasTexture {
    const key = `${options.type}_${options.width}`;
    if (this.textureCache.has(key)) {
      return this.textureCache.get(key)!;
    }

    const canvas = document.createElement('canvas');
    // Width: 512px (cross-section from left shoulder to right shoulder)
    // Height: 1024px (along road length, representing ~16m repeat distance)
    const cw = 512;
    const ch = 1024;
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext('2d')!;

    // 1. Authentic Indian Black Dammar (Asphalt) Base with Aggregate Texture
    ctx.fillStyle = '#141822';
    ctx.fillRect(0, 0, cw, ch);

    // Stochastic aggregate speckle (asphalt bitumen + crushed stone aggregates)
    const imgData = ctx.getImageData(0, 0, cw, ch);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 16;
      data[i] = Math.max(14, Math.min(38, data[i] + noise));
      data[i + 1] = Math.max(16, Math.min(42, data[i + 1] + noise));
      data[i + 2] = Math.max(22, Math.min(48, data[i + 2] + noise));
    }
    ctx.putImageData(imgData, 0, 0);

    const isExpressway = options.type === 'expressway';

    // 2. Darker Tire Wear Tracks (Polished black dammar where tires roll)
    ctx.fillStyle = 'rgba(8, 12, 18, 0.55)';
    if (isExpressway) {
      // 4-lane configuration (2 lanes left, 2 lanes right)
      // Left outer lane tire tracks
      ctx.fillRect(cw * 0.12, 0, cw * 0.08, ch);
      ctx.fillRect(cw * 0.26, 0, cw * 0.08, ch);
      // Left inner lane tire tracks
      ctx.fillRect(cw * 0.35, 0, cw * 0.06, ch);
      ctx.fillRect(cw * 0.44, 0, cw * 0.05, ch);
      // Right inner lane tire tracks
      ctx.fillRect(cw * 0.51, 0, cw * 0.05, ch);
      ctx.fillRect(cw * 0.60, 0, cw * 0.06, ch);
      // Right outer lane tire tracks
      ctx.fillRect(cw * 0.66, 0, cw * 0.08, ch);
      ctx.fillRect(cw * 0.80, 0, cw * 0.08, ch);
    } else {
      // 2-lane configuration (Left oncoming lane, Right forward lane)
      // Left lane tire tracks
      ctx.fillRect(cw * 0.18, 0, cw * 0.11, ch);
      ctx.fillRect(cw * 0.36, 0, cw * 0.11, ch);
      // Right lane tire tracks
      ctx.fillRect(cw * 0.53, 0, cw * 0.11, ch);
      ctx.fillRect(cw * 0.71, 0, cw * 0.11, ch);
    }

    // 3. Shoulder Edge Rumble Notches (Transverse acoustic vibration strips along edge)
    const leftShoulderX = cw * 0.06;
    const rightShoulderX = cw * 0.94;

    ctx.fillStyle = 'rgba(10, 14, 22, 0.8)';
    const notchCount = 32; // Every 0.5m
    const notchH = ch / notchCount;
    for (let n = 0; n < notchCount; n++) {
      if (n % 2 === 0) {
        // Left rumble notch
        ctx.fillRect(leftShoulderX - 14, n * notchH + 4, 12, notchH - 8);
        // Right rumble notch
        ctx.fillRect(rightShoulderX + 2, n * notchH + 4, 12, notchH - 8);
      }
    }

    // 4. Solid White Shoulder Lines (Fog Lines)
    // Left shoulder line
    this.drawCrispSolidLine(ctx, leftShoulderX, 0, leftShoulderX, ch, 10, '#f8fafc', '#94a3b8');
    // Right shoulder line
    this.drawCrispSolidLine(ctx, rightShoulderX, 0, rightShoulderX, ch, 10, '#f8fafc', '#94a3b8');

    // 5. Center Line Markings
    if (isExpressway) {
      // Expressway: Dual continuous yellow center median lines + white dashed lane separation lines
      const midLeftX = cw * 0.485;
      const midRightX = cw * 0.515;

      // Double continuous yellow divider lines
      this.drawCrispSolidLine(ctx, midLeftX, 0, midLeftX, ch, 7, '#facc15', '#ca8a04');
      this.drawCrispSolidLine(ctx, midRightX, 0, midRightX, ch, 7, '#facc15', '#ca8a04');

      // Yellow diagonal hatching between median lines
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 3;
      for (let y = -50; y < ch + 50; y += 32) {
        ctx.beginPath();
        ctx.moveTo(midLeftX, y);
        ctx.lineTo(midRightX, y + 24);
        ctx.stroke();
      }

      // White dashed lane separation lines (Left lane separator & Right lane separator)
      const leftLaneSepX = cw * 0.27;
      const rightLaneSepX = cw * 0.73;

      // 4m painted dash (256px), 8m gap (512px) per 1024px repeat
      this.drawDashedLine(ctx, leftLaneSepX, 0, ch, 240, 272, 6, '#ffffff', '#cbd5e1');
      this.drawDashedLine(ctx, rightLaneSepX, 0, ch, 240, 272, 6, '#ffffff', '#cbd5e1');
    } else {
      // 2-lane National / State Highway: Vibrant yellow dashed center line
      const centerX = cw * 0.5;

      // In Gujarat / Indian Highway standard: 4.5m dash + 7.5m gap (or alternating dashed)
      // 2 distinct dashed segments per 1024px cycle (approx 280px dash + 232px gap)
      this.drawDashedLine(ctx, centerX, 0, ch, 280, 232, 10, '#facc15', '#eab308');
    }

    // 6. Retro-Reflective Road Studs (Cat's Eyes / RPMs)
    // Embedded with subtle top highlight and cast shadow
    const studInterval = ch / 4; // 4 studs per 16m repeat (every 4m)
    for (let s = 0; s < 4; s++) {
      const sy = s * studInterval + studInterval * 0.5;

      if (isExpressway) {
        // Yellow studs between double yellow lines
        this.drawCatEye(ctx, cw * 0.5, sy, '#fef08a', '#ca8a04');
        // White studs along shoulder fog lines
        this.drawCatEye(ctx, leftShoulderX, sy, '#ffffff', '#64748b');
        this.drawCatEye(ctx, rightShoulderX, sy, '#ffffff', '#64748b');
      } else {
        // Yellow studs along center dashed line
        this.drawCatEye(ctx, cw * 0.5, sy, '#fde047', '#b45309');
        // White studs along shoulder fog lines
        this.drawCatEye(ctx, leftShoulderX, sy, '#ffffff', '#64748b');
        this.drawCatEye(ctx, rightShoulderX, sy, '#ffffff', '#64748b');
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = 8;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = true;

    this.textureCache.set(key, texture);
    return texture;
  }

  /**
   * Generates a circular high-definition canvas texture for city junction roundabouts
   * complete with outer solid white boundary, concentric dashed circulation lines,
   * radial zebra crossings, and directional painted arrows.
   */
  public static getRoundaboutTexture(): THREE.CanvasTexture {
    const key = 'roundabout_texture';
    if (this.textureCache.has(key)) {
      return this.textureCache.get(key)!;
    }

    const size = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const center = size / 2;

    // 1. Black Dammar (Asphalt) Base
    ctx.fillStyle = '#141822';
    ctx.beginPath();
    ctx.arc(center, center, center - 2, 0, Math.PI * 2);
    ctx.fill();

    // Noise speckles
    const imgData = ctx.getImageData(0, 0, size, size);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] > 0) {
        const noise = (Math.random() - 0.5) * 16;
        data[i] = Math.max(14, Math.min(38, data[i] + noise));
        data[i + 1] = Math.max(16, Math.min(42, data[i + 1] + noise));
        data[i + 2] = Math.max(22, Math.min(48, data[i + 2] + noise));
      }
    }
    ctx.putImageData(imgData, 0, 0);

    // 2. Concentric Tire Wear Rings
    ctx.strokeStyle = 'rgba(8, 12, 18, 0.55)';
    ctx.lineWidth = 42;
    ctx.beginPath();
    ctx.arc(center, center, center * 0.62, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(center, center, center * 0.82, 0, Math.PI * 2);
    ctx.stroke();

    // 3. Outer Solid White Edge Ring
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(center, center, center * 0.96, 0, Math.PI * 2);
    ctx.stroke();

    // 4. Concentric White Dashed Lane Divider Ring
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 7;
    ctx.setLineDash([28, 28]);
    ctx.beginPath();
    ctx.arc(center, center, center * 0.68, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]); // Reset dash

    // 5. Radial Zebra Pedestrian Crossings at 4 cardinal entries (N, E, S, W)
    [0, Math.PI / 2, Math.PI, (Math.PI * 3) / 2].forEach((entryAngle) => {
      ctx.save();
      ctx.translate(center, center);
      ctx.rotate(entryAngle);

      // Zebra stripes along outer entry radius
      ctx.fillStyle = '#f8fafc';
      const stripeCount = 8;
      const rStart = center * 0.82;
      const rEnd = center * 0.97;
      for (let s = -stripeCount / 2; s < stripeCount / 2; s++) {
        const sx = s * 14;
        ctx.fillRect(sx, rStart, 8, rEnd - rStart);
      }

      // Thick Solid White STOP Line before zebra
      ctx.fillStyle = '#facc15';
      ctx.fillRect(-stripeCount * 7.5, rStart - 12, stripeCount * 15, 6);

      ctx.restore();
    });

    // 6. Directional Curved Painted Arrows on Asphalt
    [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4].forEach((arrowAngle) => {
      ctx.save();
      ctx.translate(center, center);
      ctx.rotate(arrowAngle);

      ctx.fillStyle = '#f8fafc';
      ctx.translate(0, center * 0.72);
      ctx.rotate(Math.PI / 2); // tangent to circle

      // Draw standard curved roundabout arrow
      ctx.beginPath();
      ctx.moveTo(-18, -4);
      ctx.lineTo(6, -4);
      ctx.lineTo(6, -10);
      ctx.lineTo(20, 0);
      ctx.lineTo(6, 10);
      ctx.lineTo(6, 4);
      ctx.lineTo(-18, 4);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    });

    // 7. Yellow Chevron Safety Markings around the central island kerb
    const innerRadius = center * 0.32;
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 6;
    const chevronCount = 16;
    for (let c = 0; c < chevronCount; c++) {
      const a = (c / chevronCount) * Math.PI * 2;
      const ax = center + Math.cos(a) * innerRadius;
      const ay = center + Math.sin(a) * innerRadius;
      const bx = center + Math.cos(a + 0.14) * (innerRadius + 24);
      const by = center + Math.sin(a + 0.14) * (innerRadius + 24);

      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.anisotropy = 8;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.generateMipmaps = true;

    this.textureCache.set(key, texture);
    return texture;
  }

  /**
   * Generates a yellow transverse rumble strip bar texture for junction approaches
   */
  public static getRumbleBarTexture(): THREE.CanvasTexture {
    const key = 'rumble_bar_texture';
    if (this.textureCache.has(key)) {
      return this.textureCache.get(key)!;
    }

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    // Transparent / dark background
    ctx.fillStyle = 'rgba(28, 36, 52, 0.95)';
    ctx.fillRect(0, 0, 256, 128);

    // 6 thick thermoplastic yellow rumble bars with bevel
    const barCount = 6;
    const barSpacing = 128 / barCount;
    for (let b = 0; b < barCount; b++) {
      const by = b * barSpacing + 4;
      ctx.fillStyle = '#ca8a04'; // Shadow edge
      ctx.fillRect(12, by + 1, 232, 10);
      ctx.fillStyle = '#facc15'; // Main bar
      ctx.fillRect(12, by, 232, 8);
      ctx.fillStyle = '#fef08a'; // Highlight
      ctx.fillRect(14, by, 228, 2);
    }

    const texture = new THREE.CanvasTexture(canvas);
    this.textureCache.set(key, texture);
    return texture;
  }

  // --- Helper Drawing Utilities ---

  private static drawCrispSolidLine(
    ctx: CanvasRenderingContext2D,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    width: number,
    color: string,
    shadowColor: string
  ) {
    // Drop shadow
    ctx.strokeStyle = shadowColor;
    ctx.lineWidth = width + 2;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    // Core high-visibility paint line
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  private static drawDashedLine(
    ctx: CanvasRenderingContext2D,
    x: number,
    startY: number,
    totalH: number,
    dashLen: number,
    gapLen: number,
    width: number,
    color: string,
    shadowColor: string
  ) {
    const cycle = dashLen + gapLen;
    const count = Math.ceil(totalH / cycle) + 1;

    for (let i = 0; i < count; i++) {
      const dy = i * cycle;
      if (dy < totalH) {
        const actualDash = Math.min(dashLen, totalH - dy);

        // Shadow / paint border
        ctx.fillStyle = shadowColor;
        ctx.fillRect(x - (width + 2) / 2, dy, width + 2, actualDash);

        // Main paint stroke
        ctx.fillStyle = color;
        ctx.fillRect(x - width / 2, dy, width, actualDash);

        // Paint edge highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.fillRect(x - width / 2 + 1, dy, width - 2, 2);
      }
    }
  }

  private static drawCatEye(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    color: string,
    baseColor: string
  ) {
    // Drop shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.beginPath();
    ctx.ellipse(x, y + 2, 6, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Base housing
    ctx.fillStyle = baseColor;
    ctx.beginPath();
    ctx.ellipse(x, y, 5, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // High reflective jewel
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(x, y - 0.5, 3.5, 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Specular spark
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x - 1, y - 1, 1, 0, Math.PI * 2);
    ctx.fill();
  }
}
