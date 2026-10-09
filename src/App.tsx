import { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine } from './game/engine';
import { GameState, UnitType, BuildingType, UNIT_STATS, BUILDING_STATS } from './game/types';

type Screen = 'menu' | 'game' | 'briefing';

// Briefing Screen
function BriefingScreen({ onStart, onBack }: { onStart: () => void; onBack: () => void }) {
  return (
    <div className="w-full h-screen relative overflow-hidden bg-black flex items-center justify-center">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-950 via-[#0a0a0a] to-black" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,_rgba(180,100,20,0.03)_0%,_transparent_60%)]" />
      
      {/* Content */}
      <div className="relative z-10 max-w-2xl w-full px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="text-amber-500/60 text-xs tracking-[0.4em] uppercase font-mono mb-2">Einsatzbefehl</div>
          <h2 className="text-3xl font-bold text-gray-100 tracking-wide">MISSION 1: VORPOSTEN ALPHA</h2>
          <div className="h-px w-full bg-gradient-to-r from-amber-500/30 via-amber-500/10 to-transparent mt-3" />
        </div>

        {/* Briefing Content */}
        <div className="space-y-6 mb-10">
          <div className="border border-gray-800 bg-gray-900/30 p-4">
            <h3 className="text-amber-400/80 text-xs font-mono tracking-wider uppercase mb-2">Lage</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              Feindliche Streitkräfte haben Stellung in der Sektor-Region bezogen. 
              Ihr Hauptquartier muss aufgeklärt und zerstört werden. Die eigene Basis ist 
              teilweise aufgebaut — Ressourcen müssen gesichert und die Produktion verstärkt werden.
            </p>
          </div>

          <div className="border border-gray-800 bg-gray-900/30 p-4">
            <h3 className="text-amber-400/80 text-xs font-mono tracking-wider uppercase mb-2">Ziele</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2 text-gray-300">
                <span className="text-green-400 mt-0.5">◆</span>
                Zerstöre das gegnerische Hauptquartier
              </li>
              <li className="flex items-start gap-2 text-gray-300">
                <span className="text-amber-400 mt-0.5">◆</span>
                Sichere die Ressourcenlager in der Region
              </li>
              <li className="flex items-start gap-2 text-gray-300">
                <span className="text-amber-400 mt-0.5">◆</span>
                Erhalte die eigene Basis funktionsfähig
              </li>
            </ul>
          </div>

          <div className="border border-gray-800 bg-gray-900/30 p-4">
            <h3 className="text-amber-400/80 text-xs font-mono tracking-wider uppercase mb-2">Verfügbare Kräfte</h3>
            <div className="grid grid-cols-2 gap-2 text-sm text-gray-400">
              <div>• 2× Kampfpanzer</div>
              <div>• 1× Leichter Panzer</div>
              <div>• 1× Spähwagen</div>
              <div>• 1× Erntefahrzeug</div>
              <div>• Hauptquartier</div>
              <div>• Fahrzeugfabrik</div>
            </div>
          </div>
        </div>

        {/* Controls hint */}
        <div className="mb-8 p-3 border border-gray-800/50 bg-gray-900/20">
          <h3 className="text-gray-500 text-xs font-mono tracking-wider uppercase mb-2">Steuerung</h3>
          <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-xs text-gray-500">
            <span><kbd className="text-gray-400">WASD</kbd> — Kamera bewegen</span>
            <span><kbd className="text-gray-400">Mausrad</kbd> — Zoom</span>
            <span><kbd className="text-gray-400">Linksklick</kbd> — Auswählen</span>
            <span><kbd className="text-gray-400">Rechtsklick</kbd> — Befehl</span>
            <span><kbd className="text-gray-400">Aufziehen</kbd> — Mehrfachauswahl</span>
            <span><kbd className="text-gray-400">Leertaste</kbd> — Pause</span>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-4">
          <button
            onClick={onStart}
            className="px-8 py-3 border border-amber-500/50 bg-amber-500/10 text-amber-200 font-mono text-sm tracking-wider uppercase hover:bg-amber-500/20 hover:border-amber-400 transition-all"
          >
            ▶ Einsatz Starten
          </button>
          <button
            onClick={onBack}
            className="px-6 py-3 border border-gray-700 text-gray-500 font-mono text-sm tracking-wider uppercase hover:border-gray-500 hover:text-gray-300 transition-all"
          >
            Zurück
          </button>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [screen, setScreen] = useState<Screen>('menu');
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<import('./game/types').GameUnit | null>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<import('./game/types').GameBuilding | null>(null);
  const [showBuildMenu, setShowBuildMenu] = useState(false);
  const [events, setEvents] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const addEvent = useCallback((msg: string) => {
    setEvents(prev => [msg, ...prev].slice(0, 8));
  }, []);

  const startGame = () => {
    setScreen('briefing');
  };

  const startBattle = () => {
    setScreen('game');
  };

  useEffect(() => {
    if (screen !== 'game' || !containerRef.current) return;

    const engine = new GameEngine(containerRef.current, (state) => {
      setGameState({ ...state });

      // Update selected unit info
      const sel = state.units.find(u => u.selected);
      if (sel) {
        setSelectedUnit({ ...sel });
        setSelectedBuilding(null);
      } else {
        setSelectedUnit(null);
      }
    });

    engineRef.current = engine;

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, [screen]);

  const handleProduce = (type: UnitType) => {
    if (!engineRef.current) return;
    const success = engineRef.current.produceUnit(type);
    if (success) {
      addEvent(`Produktion gestartet: ${getUnitName(type)}`);
    } else {
      addEvent(`Nicht genügend Ressourcen für ${getUnitName(type)}`);
    }
  };

  const handleBuild = (type: BuildingType) => {
    if (!engineRef.current) return;
    const success = engineRef.current.buildBuilding(type);
    if (success) {
      addEvent(`Gebäude errichtet: ${getBuildingName(type)}`);
      setShowBuildMenu(false);
    } else {
      addEvent(`Nicht genügend Ressourcen für ${getBuildingName(type)}`);
    }
  };

  if (screen === 'menu') {
    return <MainMenu onStart={startGame} />;
  }

  if (screen === 'briefing') {
    return <BriefingScreen onStart={startBattle} onBack={() => setScreen('menu')} />;
  }

  return (
    <div className="w-full h-screen relative overflow-hidden bg-black">
      {/* 3D Game Canvas */}
      <div ref={containerRef} className="absolute inset-0" />

      {/* Selection Box Overlay */}
      {engineRef.current?.getSelectionBox() && (
        <SelectionBox engine={engineRef.current} />
      )}

      {/* HUD */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Top Bar - Resources & Mission */}
        <div className="pointer-events-auto">
          <TopBar gameState={gameState} engine={engineRef.current} />
        </div>

        {/* Minimap */}
        <div className="absolute top-16 left-4 pointer-events-auto">
          <Minimap gameState={gameState} engine={engineRef.current} />
        </div>

        {/* Bottom Panel */}
        <div className="absolute bottom-0 left-0 right-0 pointer-events-auto">
          <BottomPanel
            gameState={gameState}
            selectedUnit={selectedUnit}
            selectedBuilding={selectedBuilding}
            onProduce={handleProduce}
            onBuild={handleBuild}
            showBuildMenu={showBuildMenu}
            setShowBuildMenu={setShowBuildMenu}
            engine={engineRef.current}
          />
        </div>

        {/* Event Log */}
        <div className="absolute top-16 right-4 w-72 pointer-events-none">
          <EventLog events={events} />
        </div>

        {/* Game Over Overlay */}
        {gameState?.gameOver && (
          <GameOverOverlay gameState={gameState} engine={engineRef.current} onMenu={() => setScreen('menu')} />
        )}

        {/* Pause Overlay */}
        {gameState?.paused && !gameState?.gameOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="text-center">
              <h2 className="text-4xl font-bold text-white mb-4 tracking-wider">PAUSIERT</h2>
              <p className="text-gray-400">Leertaste zum Fortsetzen</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Selection Box component
function SelectionBox({ engine }: { engine: GameEngine | null }) {
  const [box, setBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      const sb = engine?.getSelectionBox();
      if (sb) {
        const x = Math.min(sb.start.x, sb.end.x);
        const y = Math.min(sb.start.y, sb.end.y);
        const w = Math.abs(sb.end.x - sb.start.x);
        const h = Math.abs(sb.end.y - sb.start.y);
        setBox({ x, y, w, h });
      } else {
        setBox(null);
      }
    }, 16);
    return () => clearInterval(interval);
  }, [engine]);

  if (!box) return null;

  return (
    <div
      className="absolute border border-green-400 bg-green-400/10 pointer-events-none z-50"
      style={{ left: box.x, top: box.y, width: box.w, height: box.h }}
    />
  );
}

// Main Menu
function MainMenu({ onStart }: { onStart: () => void }) {
  return (
    <div className="w-full h-screen relative overflow-hidden bg-black">
      {/* Atmospheric background layers */}
      <div className="absolute inset-0">
        {/* Base gradient - dark industrial */}
        <div className="absolute inset-0 bg-gradient-to-b from-gray-950 via-[#0d0d0d] to-black" />
        
        {/* Warm glow from below - like distant fires */}
        <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-amber-950/20 via-orange-950/10 to-transparent" />
        
        {/* Dramatic light beam */}
        <div className="absolute top-0 left-1/4 w-1/2 h-full bg-gradient-to-b from-amber-900/5 via-transparent to-transparent"
          style={{ transform: 'skewX(-15deg)' }} />
        
        {/* Atmospheric haze */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_80%,_rgba(180,100,20,0.08)_0%,_transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_60%,_rgba(100,50,10,0.05)_0%,_transparent_40%)]" />
      </div>

      {/* Animated particles/embers */}
      <div className="absolute inset-0 overflow-hidden">
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${60 + Math.random() * 40}%`,
              width: `${1 + Math.random() * 3}px`,
              height: `${1 + Math.random() * 3}px`,
              background: `rgba(${200 + Math.random() * 55}, ${100 + Math.random() * 80}, ${Math.random() * 30}, ${0.3 + Math.random() * 0.4})`,
              animation: `float ${5 + Math.random() * 10}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 5}s`,
            }}
          />
        ))}
      </div>

      {/* Grid overlay - tactical feel */}
      <div className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)',
          backgroundSize: '60px 60px'
        }}
      />

      {/* Scan line effect */}
      <div className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)',
        }}
      />

      {/* Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_40%,_rgba(0,0,0,0.7)_100%)]" />

      <div className="relative z-10 flex flex-col items-center justify-center h-full">
        {/* Title */}
        <div className="text-center mb-16">
          <div className="text-amber-500/60 text-sm tracking-[0.5em] uppercase mb-4 font-mono">
            ◆ Tactical Command ◆
          </div>
          <h1 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-amber-200 via-amber-400 to-amber-600 tracking-tight leading-none mb-2"
            style={{ textShadow: '0 0 40px rgba(217, 119, 6, 0.3)' }}>
            OPERATION
          </h1>
          <h2 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-gray-200 via-gray-300 to-gray-500 tracking-wider">
            IRON FRONT
          </h2>
          <div className="mt-4 h-px w-64 mx-auto bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
        </div>

        {/* Menu Buttons */}
        <div className="flex flex-col gap-3 w-72">
          <MenuButton primary onClick={onStart}>
            <span className="flex items-center gap-3">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              GEFecht STARTEN
            </span>
          </MenuButton>
          <MenuButton onClick={() => {}}>
            <span className="flex items-center gap-3">
              <span className="w-2 h-2 bg-amber-400 rounded-full" />
              KAMPAGNE
            </span>
          </MenuButton>
          <MenuButton onClick={() => {}}>
            <span className="flex items-center gap-3">
              <span className="w-2 h-2 bg-blue-400 rounded-full" />
              FAHRZEUGDESIGN
            </span>
          </MenuButton>
          <MenuButton onClick={() => {}}>
            <span className="flex items-center gap-3">
              <span className="w-2 h-2 bg-gray-400 rounded-full" />
              EINSTELLUNGEN
            </span>
          </MenuButton>
        </div>

        {/* Footer */}
        <div className="absolute bottom-8 text-center">
          <p className="text-gray-600 text-xs tracking-wider font-mono">
            v0.1.0 VERTICAL SLICE • THREE.JS WEBGL
          </p>
          <p className="text-gray-700 text-xs mt-1">
            Steuerung: WASD Bewegen • Mausrad Zoom • Linksklick Auswählen • Rechtsklick Befehl
          </p>
        </div>
      </div>
    </div>
  );
}

function MenuButton({ children, onClick, primary = false }: { children: React.ReactNode; onClick: () => void; primary?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`
        relative px-6 py-3 text-left font-mono text-sm tracking-wider uppercase
        border transition-all duration-200 group
        ${primary
          ? 'border-amber-500/50 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20 hover:border-amber-400'
          : 'border-gray-700 bg-gray-900/50 text-gray-400 hover:bg-gray-800/50 hover:border-gray-500 hover:text-gray-200'
        }
      `}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      {children}
    </button>
  );
}

// Top Bar
function TopBar({ gameState, engine }: { gameState: GameState | null; engine: GameEngine | null }) {
  if (!gameState) return null;

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-gradient-to-b from-gray-900/95 to-gray-900/80 border-b border-gray-700/50 backdrop-blur-sm">
      {/* Resources */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-amber-500 rounded-sm" style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }} />
          <span className="text-amber-300 font-mono text-sm font-bold">{Math.floor(gameState.playerResources)}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse" />
          <span className="text-yellow-300 font-mono text-xs">+{(5 + gameState.units.filter(u => u.type === 'harvester' && u.team === 'player').length * 10).toFixed(0)}/s</span>
        </div>
      </div>

      {/* Mission Info */}
      <div className="text-center">
        <div className="text-amber-400/80 text-xs font-mono tracking-wider">{gameState.mission}</div>
        <div className="text-gray-400 text-xs">{gameState.missionObjective}</div>
      </div>

      {/* Game Controls */}
      <div className="flex items-center gap-3">
        <div className="text-gray-500 font-mono text-xs">
          {formatTime(gameState.gameTime)}
        </div>
        <div className="flex gap-1">
          {[1, 2, 3].map(speed => (
            <button
              key={speed}
              onClick={() => engine?.setGameSpeed(speed)}
              className={`px-2 py-0.5 text-xs font-mono border ${
                gameState.gameSpeed === speed
                  ? 'border-amber-500 text-amber-300 bg-amber-500/20'
                  : 'border-gray-700 text-gray-500 hover:border-gray-500'
              }`}
            >
              {speed}x
            </button>
          ))}
        </div>
        <button
          onClick={() => engine?.togglePause()}
          className="px-2 py-0.5 text-xs font-mono border border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200"
        >
          {gameState.paused ? '▶' : '⏸'}
        </button>
      </div>
    </div>
  );
}

// Minimap
function Minimap({ gameState, engine }: { gameState: GameState | null; engine: GameEngine | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !gameState) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const w = 180;
    const h = 180;
    const scale = w / 120;

    // Background
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, w, h);

    // Terrain
    ctx.fillStyle = '#1a1a15';
    ctx.fillRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < w; i += 30) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, h);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(w, i);
      ctx.stroke();
    }

    // Resources
    for (const res of gameState.resources) {
      if (res.amount > 0) {
        ctx.fillStyle = '#aa8833';
        const s = 2 + (res.amount / res.maxAmount) * 3;
        ctx.fillRect(res.position.x * scale - s / 2, res.position.z * scale - s / 2, s, s);
      }
    }

    // Buildings
    for (const b of gameState.buildings) {
      ctx.fillStyle = b.team === 'player' ? '#3a7d44' : '#8b2020';
      const size = Math.max(3, BUILDING_STATS[b.type].size * scale);
      ctx.fillRect(b.position.x * scale - size / 2, b.position.z * scale - size / 2, size, size);
    }

    // Units
    for (const u of gameState.units) {
      if (u.state === 'dead') continue;
      ctx.fillStyle = u.team === 'player' ? (u.selected ? '#00ffaa' : '#00cc66') : '#ff4444';
      ctx.beginPath();
      ctx.arc(u.position.x * scale, u.position.z * scale, u.selected ? 3 : 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Border
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, w, h);
  }, [gameState]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!engine) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width * 120;
    const z = (e.clientY - rect.top) / rect.height * 120;
    // Move camera to clicked position on minimap
    // This would need access to camera target - for now just visual
  };

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={180}
        height={180}
        className="border border-gray-700/50 bg-black/90 rounded cursor-crosshair"
        onClick={handleClick}
      />
      <div className="absolute top-1 left-1.5 text-[9px] font-mono text-gray-500 uppercase tracking-wider">Taktische Karte</div>
      <div className="absolute bottom-1 right-1.5 text-[8px] font-mono text-gray-600">
        {gameState ? `${gameState.units.filter(u => u.team === 'player' && u.state !== 'dead').length} Einheiten` : ''}
      </div>
    </div>
  );
}

// Bottom Panel
function BottomPanel({
  gameState, selectedUnit, selectedBuilding, onProduce, onBuild, showBuildMenu, setShowBuildMenu, engine
}: {
  gameState: GameState | null;
  selectedUnit: import('./game/types').GameUnit | null;
  selectedBuilding: import('./game/types').GameBuilding | null;
  onProduce: (type: UnitType) => void;
  onBuild: (type: BuildingType) => void;
  showBuildMenu: boolean;
  setShowBuildMenu: (v: boolean) => void;
  engine: GameEngine | null;
}) {
  if (!gameState) return null;

  const factory = gameState.buildings.find(b => b.type === 'factory' && b.team === 'player');
  const isProducing = factory?.producing;

  return (
    <div className="flex h-40 bg-gradient-to-t from-gray-900/98 to-gray-900/90 border-t border-gray-700/50 backdrop-blur-sm">
      {/* Unit/Building Info */}
      <div className="w-64 p-3 border-r border-gray-700/30">
        {selectedUnit ? (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-green-900/50 border border-green-700/50 rounded flex items-center justify-center">
                <span className="text-green-400 text-xs">{getUnitIcon(selectedUnit.type)}</span>
              </div>
              <div>
                <div className="text-green-300 text-sm font-bold">{getUnitName(selectedUnit.type)}</div>
                <div className="text-gray-500 text-xs font-mono">{selectedUnit.state.toUpperCase()}</div>
              </div>
            </div>
            <div className="space-y-1">
              <StatusBar label="HP" value={selectedUnit.hp} max={selectedUnit.maxHp} color="green" />
              <div className="flex justify-between text-xs text-gray-500 font-mono">
                <span>DMG: {UNIT_STATS[selectedUnit.type].damage}</span>
                <span>RNG: {UNIT_STATS[selectedUnit.type].attackRange}</span>
                <span>SPD: {UNIT_STATS[selectedUnit.type].speed}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-500 font-mono">
                <span>ARM: {UNIT_STATS[selectedUnit.type].armor}</span>
                <span>SIGHT: {UNIT_STATS[selectedUnit.type].sightRange}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-gray-600 text-sm font-mono">
            <p>Keine Auswahl</p>
            <p className="text-xs mt-2 text-gray-700">Linksklick: Auswählen</p>
            <p className="text-xs text-gray-700">Rechtsklick: Befehl</p>
          </div>
        )}
      </div>

      {/* Production / Commands */}
      <div className="flex-1 p-3">
        {isProducing ? (
          <div className="mb-3">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Produktion: {getUnitName(isProducing)}</span>
              <span>{Math.floor((factory?.productionProgress || 0) / UNIT_STATS[isProducing].buildTime * 100)}%</span>
            </div>
            <div className="h-2 bg-gray-800 rounded overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-300"
                style={{ width: `${(factory?.productionProgress || 0) / UNIT_STATS[isProducing].buildTime * 100}%` }}
              />
            </div>
          </div>
        ) : null}

        <div className="flex gap-2 flex-wrap">
          {(['scout', 'light_tank', 'medium_tank', 'heavy_tank', 'artillery', 'apc'] as UnitType[]).map(type => (
            <button
              key={type}
              onClick={() => onProduce(type)}
              className={`
                relative flex flex-col items-center justify-center w-16 h-16 border rounded
                transition-all duration-150 group
                ${gameState.playerResources >= UNIT_STATS[type].cost
                  ? 'border-gray-600 bg-gray-800/50 hover:border-amber-500/50 hover:bg-gray-700/50'
                  : 'border-gray-800 bg-gray-900/50 opacity-50 cursor-not-allowed'
                }
              `}
              disabled={gameState.playerResources < UNIT_STATS[type].cost}
            >
              <span className="text-lg">{getUnitIcon(type)}</span>
              <span className="text-[9px] text-gray-400 font-mono mt-0.5">{UNIT_STATS[type].cost}</span>
              <div className="absolute inset-0 bg-amber-500/0 group-hover:bg-amber-500/5 transition-colors rounded" />
            </button>
          ))}
        </div>
      </div>

      {/* Build Menu Toggle */}
      <div className="w-48 p-3 border-l border-gray-700/30">
        <button
          onClick={() => setShowBuildMenu(!showBuildMenu)}
          className="w-full px-3 py-2 text-xs font-mono text-gray-400 border border-gray-700 hover:border-amber-500/50 hover:text-amber-300 transition-colors mb-2"
        >
          ▲ BAUEN
        </button>
        {showBuildMenu && (
          <div className="space-y-1">
            {(['factory', 'powerplant', 'refinery', 'turret', 'radar', 'repair'] as BuildingType[]).map(type => (
              <button
                key={type}
                onClick={() => onBuild(type)}
                className={`w-full px-2 py-1 text-left text-xs font-mono border rounded transition-colors
                  ${gameState.playerResources >= BUILDING_STATS[type].cost
                    ? 'border-gray-700 text-gray-400 hover:border-amber-500/50 hover:text-amber-300'
                    : 'border-gray-800 text-gray-600 cursor-not-allowed'
                  }
                `}
                disabled={gameState.playerResources < BUILDING_STATS[type].cost}
              >
                <span>{getBuildingName(type)}</span>
                <span className="float-right text-amber-500/70">{BUILDING_STATS[type].cost}</span>
              </button>
            ))}
          </div>
        )}

        {/* Army Overview */}
        <div className="mt-3 pt-2 border-t border-gray-800">
          <div className="text-[9px] text-gray-600 font-mono uppercase tracking-wider mb-1">Verband</div>
          <div className="flex flex-wrap gap-1">
            {gameState.units.filter(u => u.team === 'player' && u.state !== 'dead').map(u => (
              <div
                key={u.id}
                className={`w-3 h-3 rounded-sm ${u.selected ? 'bg-green-400' : 'bg-green-800'}`}
                title={getUnitName(u.type)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Event Log
function EventLog({ events }: { events: string[] }) {
  return (
    <div className="space-y-1">
      {events.map((event, i) => (
        <div
          key={i}
          className="px-2 py-1 bg-black/60 border-l-2 border-amber-500/50 text-xs font-mono text-gray-300 backdrop-blur-sm"
          style={{ opacity: 1 - i * 0.12 }}
        >
          {event}
        </div>
      ))}
    </div>
  );
}

// Game Over Overlay
function GameOverOverlay({ gameState, engine, onMenu }: { gameState: GameState; engine: GameEngine | null; onMenu: () => void }) {
  const isVictory = gameState.winner === 'player';

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="text-center">
        <h2 className={`text-6xl font-black tracking-wider mb-4 ${isVictory ? 'text-green-400' : 'text-red-400'}`}>
          {isVictory ? 'SIEG' : 'NIEDERLAGE'}
        </h2>
        <p className="text-gray-400 mb-8 font-mono">
          {isVictory ? 'Das gegnerische Hauptquartier wurde zerstört.' : 'Ihr Hauptquartier wurde zerstört.'}
        </p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => engine?.restart()}
            className="px-6 py-2 border border-amber-500/50 text-amber-300 font-mono text-sm hover:bg-amber-500/20 transition-colors"
          >
            NEUES GEFecht
          </button>
          <button
            onClick={onMenu}
            className="px-6 py-2 border border-gray-600 text-gray-400 font-mono text-sm hover:bg-gray-800 transition-colors"
          >
            HAUPTMENÜ
          </button>
        </div>
      </div>
    </div>
  );
}

// Status Bar Component
function StatusBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const colorClasses: Record<string, string> = {
    green: 'from-green-600 to-green-400',
    red: 'from-red-600 to-red-400',
    blue: 'from-blue-600 to-blue-400',
  };

  return (
    <div>
      <div className="flex justify-between text-[10px] font-mono text-gray-500 mb-0.5">
        <span>{label}</span>
        <span>{Math.floor(value)}/{max}</span>
      </div>
      <div className="h-1.5 bg-gray-800 rounded overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${colorClasses[color] || colorClasses.green} transition-all duration-200`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// Helper functions
function getUnitName(type: UnitType): string {
  const names: Record<UnitType, string> = {
    scout: 'Spähwagen',
    light_tank: 'Leichter Panzer',
    medium_tank: 'Kampfpanzer',
    heavy_tank: 'Schwerer Panzer',
    artillery: 'Artillerie',
    apc: 'Schützenpanzer',
    harvester: 'Erntefahrzeug',
  };
  return names[type] || type;
}

function getBuildingName(type: BuildingType): string {
  const names: Record<BuildingType, string> = {
    hq: 'Hauptquartier',
    factory: 'Fahrzeugfabrik',
    powerplant: 'Kraftwerk',
    refinery: 'Raffinerie',
    turret: 'Geschützturm',
    radar: 'Radarstation',
    repair: 'Reparaturwerkstatt',
  };
  return names[type] || type;
}

function getUnitIcon(type: UnitType): string {
  const icons: Record<UnitType, string> = {
    scout: '◇',
    light_tank: '△',
    medium_tank: '▲',
    heavy_tank: '◆',
    artillery: '⬡',
    apc: '□',
    harvester: '⬢',
  };
  return icons[type] || '●';
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default App;
