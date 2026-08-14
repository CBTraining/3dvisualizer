import { WallTextureManager } from './three/WallTextureManager.js';
import { SceneManager } from './three/SceneManager.js';
import { DrawingCanvas } from './components/DrawingCanvas.js';
import { WallEditorUI } from './components/WallEditorUI.js';
import { TopBarUI } from './components/TopBarUI.js';
import { storage } from './utils/storage.js';

class App {
  constructor() {
    this.saveTimeout = null;
    this.init();
  }

  async init() {
    // 1. Initialize Wall Texture Manager
    this.textureManager = new WallTextureManager(() => {
      if (this.roomBuilder) {
        this.roomBuilder.updateTextures();
      }
      if (this.drawingCanvas) {
        this.drawingCanvas.refreshView();
      }
      this.scheduleAutoSave();
    });

    // 2. Initialize 3D Scene
    const viewportContainer = document.getElementById('threeCanvasContainer');
    this.sceneManager = new SceneManager(
      viewportContainer,
      this.textureManager,
      (selectedSectionId) => {
        // Wall clicked in 3D scene
        this.selectWallSection(selectedSectionId);
      }
    );
    this.roomBuilder = this.sceneManager.roomBuilder;

    // 3. Initialize TopBar UI
    const topbarContainer = document.getElementById('topbarContainer');
    this.topbar = new TopBarUI(
      topbarContainer,
      this.sceneManager,
      this.roomBuilder,
      this.textureManager,
      storage
    );

    // 4. Initialize Wall Editor UI (Right sidebar)
    const wallEditorContainer = document.getElementById('wallEditorContainer');
    this.wallEditor = new WallEditorUI(
      wallEditorContainer,
      this.textureManager,
      this.roomBuilder,
      this.sceneManager,
      () => {
        this.roomBuilder.updateTextures();
        this.drawingCanvas.refreshView();
        this.updateBadge();
        this.scheduleAutoSave();
      }
    );

    // 5. Initialize 2D Concept Drawing Studio (Bottom drawer)
    const drawingContainer = document.getElementById('drawingContainer');
    this.drawingCanvas = new DrawingCanvas(
      drawingContainer,
      this.textureManager,
      () => {
        this.roomBuilder.updateTextures();
        this.scheduleAutoSave();
      }
    );

    // 6. Setup Drawer Collapse / Expand
    this.setupDrawer();

    // 7. Load from Cache or Seed with Demo Content
    await this.loadInitialState();

    this.updateBadge();
  }

  setupDrawer() {
    const drawerBar = document.getElementById('drawerBar');
    const drawerHandle = document.getElementById('drawerHandle');
    const drawerIcon = document.getElementById('drawerIcon');

    let isCollapsed = false;

    drawerHandle.addEventListener('click', () => {
      isCollapsed = !isCollapsed;
      drawerBar.classList.toggle('collapsed', isCollapsed);
      drawerIcon.style.transform = isCollapsed ? 'rotate(180deg)' : 'rotate(0deg)';
      
      // Delay resize to allow CSS transition
      setTimeout(() => {
        if (this.drawingCanvas) this.drawingCanvas.resizeCanvas();
      }, 300);
    });
  }

  selectWallSection(sectionId) {
    this.textureManager.setActiveSection(sectionId);
    this.wallEditor.selectSection(sectionId);
    this.drawingCanvas.refreshView();
    this.updateBadge();
  }

  updateBadge() {
    const badge = document.getElementById('activeSectionBadge');
    const active = this.textureManager.getActiveSection();
    if (badge && active) {
      badge.textContent = `Active: ${active.name} • 15 ft`;
    }
  }

  scheduleAutoSave() {
    clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(async () => {
      const data = {
        dimensions: this.roomBuilder.params,
        walls: this.textureManager.serializeAll()
      };
      await storage.saveProject(data);
      this.topbar.flashCacheIndicator('Saved to Cache');
    }, 600);
  }

  async loadInitialState() {
    try {
      const cached = await storage.loadProject();
      if (cached && cached.walls) {
        console.log('Restoring room from cache...');
        if (cached.dimensions) {
          this.roomBuilder.setDimensions(cached.dimensions);
        }
        await this.textureManager.deserializeAll(cached.walls);
        this.roomBuilder.updateTextures();
        this.wallEditor.updateForActiveSection();
        this.drawingCanvas.refreshView();
      } else {
        // Seed Wall 1 with nice default artwork
        console.log('Starting fresh project with demo presets...');
        this.wallEditor.loadSampleGraphic('geometric');
        
        // Seed Wall 3 with a blueprint sample
        setTimeout(() => {
          this.textureManager.setActiveSection(3);
          this.wallEditor.loadSampleGraphic('architectural');
          this.textureManager.setActiveSection(1);
          this.wallEditor.updateForActiveSection();
          this.drawingCanvas.refreshView();
        }, 100);
      }
    } catch (e) {
      console.warn('Error loading initial state:', e);
    }
  }
}

// Initialize on DOM ready
window.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});
