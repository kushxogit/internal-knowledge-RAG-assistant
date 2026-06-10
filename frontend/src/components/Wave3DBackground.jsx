import React, { useEffect, useRef } from 'react';

export default function Wave3DBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) {
      console.warn("WebGL not supported in this browser.");
      return;
    }

    // Vertex Shader Source (standard full-screen quad)
    const vsSource = `
      attribute vec2 a_position;
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;

    // Fragment Shader Source (volumetric 3D glowing waves forming an hourglass shape)
    const fsSource = `
      precision highp float;
      uniform vec2 u_resolution;
      uniform float u_time;

      // Pseudo-random noise function for film grain
      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }

      void main() {
        // Normalize coordinates: center is (0,0), correct aspect ratio
        vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;
        float r = length(uv);

        // 1. Gravitational Swirl Warp Distortion (evoking a space-time vortex)
        float swirlSpeed = 1.2;
        float swirlIntensity = 0.28 * exp(-r * 2.5); // stronger near center
        float angle = atan(uv.y, uv.x);
        float swirledAngle = angle + sin(r * 12.0 - u_time * swirlSpeed) * swirlIntensity;
        
        // Dynamic radial ripple (gravitational wave)
        float ripple = sin(r * 20.0 - u_time * 2.5) * 0.02 * exp(-r * 1.5);
        float r_warped = r + ripple;
        
        vec2 uvWarped = vec2(cos(swirledAngle) * r_warped, sin(swirledAngle) * r_warped);
        float x = uvWarped.x;
        float y = uvWarped.y;
        float theta = swirledAngle;

        // 2. Volumetric Minkowski Light Cone: y = +/- x
        // Future light-cone flaring upwards (y > 0), Past flaring downwards (y < 0)
        float slope = 0.95;
        float coneLimit = abs(y) - abs(x) * slope;
        float coneMask = smoothstep(-0.02, 0.08, coneLimit);
        
        // Add a smooth radial fade so it recedes nicely at edges
        coneMask *= exp(-r_warped * 1.2);

        // 3. Volumetric Glow inside/on the cone
        float edgeGlow = 0.008 / (abs(coneLimit) + 0.007);
        float insideGlow = smoothstep(0.0, 0.12, coneLimit) * 0.18;
        float volumetricFill = (edgeGlow + insideGlow) * coneMask;

        // 4. Spacetime Coordinate Lines
        // Concentric circular time-slices (expanding outwards)
        float zDepth = r_warped * 1.6;
        float perspective = 1.0 / (1.0 + zDepth);
        float timeRingsVal = sin((r_warped * 38.0) * perspective - u_time * 3.2);
        float timeRingsGrid = smoothstep(0.97, 0.992, timeRingsVal) * 0.85;

        // Radial space coordinate grid lines (world lines stretching from center)
        float spaceLinesVal = sin(theta * 12.0);
        float spaceLinesGrid = smoothstep(0.97, 0.992, spaceLinesVal) * 0.65;
        
        // Combine grid lines, prioritizing time-slices and scaling with depth perspective
        float gridLines = max(timeRingsGrid, spaceLinesGrid) * coneMask * perspective;

        // 5. Present Event Vertex (Origin 0,0) with lens flare highlights
        float presentGlow = 0.004 / (r_warped + 0.002) + 0.012 / (r_warped + 0.018);
        
        // Horizontal and vertical light rays for lens flare
        float flareX = 0.0018 / (abs(uvWarped.y) + 0.003) * smoothstep(0.24, 0.0, abs(uvWarped.x));
        float flareY = 0.0018 / (abs(uvWarped.x) + 0.003) * smoothstep(0.24, 0.0, abs(uvWarped.y));
        float totalPresentGlow = presentGlow + (flareX + flareY) * 0.45;

        // 6. Color Compilations (neon violet, cyan coordinate lines, white hot present)
        vec3 bgSpace = vec3(0.003, 0.002, 0.008);
        
        // Add faint ambient dark blue outside of the light cones
        float outsideCone = 1.0 - coneMask;
        bgSpace += vec3(0.008, 0.012, 0.024) * outsideCone * exp(-r * 0.8);

        vec3 coneVolColor = vec3(0.28, 0.06, 0.62) * volumetricFill * 2.2;
        vec3 gridColor = vec3(0.0, 0.8, 1.0) * gridLines;
        vec3 vertexColor = mix(vec3(0.0, 0.72, 1.0), vec3(1.0, 0.96, 1.0), smoothstep(0.04, 0.4, totalPresentGlow)) * totalPresentGlow;

        vec3 finalColor = bgSpace + coneVolColor + gridColor + vertexColor;

        // Subtle vignette
        float vignette = 1.0 - dot(uv * 0.82, uv * 0.82) * 0.35;
        finalColor *= max(0.0, vignette);

        // Film grain noise
        float grain = (hash(gl_FragCoord.xy + vec2(u_time)) - 0.5) * 0.028;
        finalColor += vec3(grain);

        gl_FragColor = vec4(finalColor, 1.0);
      }
    `;

    // Helper function to compile shaders
    const compileShader = (source, type) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("Shader compilation error:", gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vs = compileShader(vsSource, gl.VERTEX_SHADER);
    const fs = compileShader(fsSource, gl.FRAGMENT_SHADER);
    if (!vs || !fs) return;

    // Create shader program
    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("Program linking error:", gl.getProgramInfoLog(program));
      return;
    }

    gl.useProgram(program);

    // Setup coordinates (full screen quad mapping clip space)
    const vertices = new Float32Array([
      -1.0, -1.0,
       1.0, -1.0,
      -1.0,  1.0,
      -1.0,  1.0,
       1.0, -1.0,
       1.0,  1.0
    ]);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const positionLoc = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

    const resolutionLoc = gl.getUniformLocation(program, 'u_resolution');
    const timeLoc = gl.getUniformLocation(program, 'u_time');

    let animationFrameId;
    let startTime = Date.now();

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const displayWidth = Math.floor(window.innerWidth * dpr);
      const displayHeight = Math.floor(window.innerHeight * dpr);

      if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        canvas.width = displayWidth;
        canvas.height = displayHeight;
        gl.viewport(0, 0, displayWidth, displayHeight);
      }
    };

    window.addEventListener('resize', resize);
    resize();

    const render = () => {
      const elapsedSeconds = (Date.now() - startTime) / 1000.0;
      
      // Pass uniforms
      gl.uniform2f(resolutionLoc, canvas.width, canvas.height);
      gl.uniform1f(timeLoc, elapsedSeconds);

      // Draw quad
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed inset-0 w-full h-full z-[-2] bg-[#020205] pointer-events-none"
    />
  );
}
