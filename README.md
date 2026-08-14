# 3D Room Designer 🏛️🎨

An interactive 3D Room Visualizer and Concepting Studio built with **Three.js** and **HTML5 Canvas**.

![Room Designer Preview](dist/assets/index.html)

---

## 🌟 Key Features

### 🏛️ 1. Rounded Rectangle Room Geometry
- **4 x 15ft Wall Sections**: North (Wall 1), East (Wall 2), South (Wall 3), and West (Wall 4).
- **Curved Fillet Corners**: Seamless rounded transition corners connecting the straight 15ft sections.
- **Architectural Details**: Realistic wood plank or porcelain tile flooring with subtle specular reflections, baseboards, and bright interior lighting.
- **3D Wall Raycasting**: Click any wall directly inside the 3D scene to focus and edit it.

### 🖼️ 2. Wall Image Upload & Customization
- **Image Uploads**: Upload PNG, JPG, WebP, or SVG graphics to any wall section.
- **Placement Modes**: Fit (letterbox), Fill (cover wall), Stretch, or Tile/Repeat pattern.
- **Transform Controls**: Scale (20% - 300%), Offset X/Y sliders, 360° Rotation, and Opacity.
- **Art Framing**: Optional thin black or gallery picture frame borders.
- **Sample Art Gallery**: 1-click preset demo posters (Geometric Bauhaus, Blueprint Elevation, Landscape, and Minimal Gallery).

### ✍️ 3. Direct Wall Drawing & Concepting Studio
- **Real-Time 3D Sync**: Sketch concept notes, annotations, and outlines directly on the 2D canvas drawer, which instantly updates the 3D wall mesh texture.
- **Tool Suite**:
  - Pen / Marker (Fine, medium, bold)
  - Highlighter (Semi-transparent color wash)
  - Shapes (Rectangle, Circle, Line)
  - Text Annotation tool
  - Eraser
  - Color palette & custom color picker
  - Undo / Redo history stack (`Ctrl+Z` / `Ctrl+Y`) & Clear layer

### 💾 4. Persistence, Cache & Project Import/Export
- **Browser Auto-Cache**: Automatically saves your room setup, images, paint finishes, and drawings to `IndexedDB` & `localStorage`.
- **Save Project File (`.json`)**: Export a single portable project file to your computer.
- **Open Project File**: Import previously saved project files to restore your workspace with 100% fidelity.
- **3D Snapshot Export**: 1-click high-resolution PNG snapshot download from any camera angle.

### 🎥 5. Camera & Navigation Presets
- **3D Orbit Overview**: 360° fluid orbital navigation with zoom and pan limits.
- **Interior POV**: Step inside the room at human eye-level (5.2 ft).
- **Floorplan Mode**: Orthographic-style top-down 2D/3D view.
- **Wall Alignment Buttons**: Snap camera straight in front of any active wall.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- npm

### Installation & Run

```bash
# Clone the repository
git clone https://github.com/CBTraining/3dvisualizer.git
cd 3dvisualizer

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

---

## 📂 Project Architecture

```
3dvisualizer/
├── index.html                   # Main application HTML & layout
├── package.json                 # Project manifest & Three.js dependencies
├── vite.config.js               # Vite build & dev-server configuration
├── src/
│   ├── main.js                  # App bootstrap & event coordination
│   ├── style.css                # Clean, modern design system
│   ├── three/
│   │   ├── SceneManager.js      # Three.js scene, renderer, raycasting, camera presets
│   │   ├── RoomBuilder.js       # Parametric rounded rectangle room geometry (4x15ft)
│   │   ├── Lighting.js          # Bright realistic lighting & soft shadows
│   │   └── WallTextureManager.js# Dynamic 2048px composite canvas texture per wall
│   ├── components/
│   │   ├── DrawingCanvas.js     # Live 2D sketching studio with real-time 3D sync
│   │   ├── WallEditorUI.js      # Wall selector, image transform, paint finishes
│   │   └── TopBarUI.js          # Views, snapshot, room options, JSON save/load
│   └── utils/
│       ├── storage.js           # IndexedDB & LocalStorage auto-caching
│       └── exportImport.js      # JSON project file download/upload & snapshot
```

---

## 📜 License
MIT License
