import React, { useEffect, useRef } from 'react';

export default function GlowingBeamBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) {
      console.warn("WebGL not supported in this browser.");
      return;
    }

    // Vertex Shader
    const vsSource = `
      attribute vec2 a_position;
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;

    // Fragment Shader
    const fsSource = `
      precision highp float;
      uniform vec2 u_resolution;
      uniform float u_time;
      uniform vec2 u_mouse;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }

      void main() {
        // Normalize coordinates to [-1, 1]
        vec2 uv = (gl_FragCoord.xy / u_resolution.xy) * 2.0 - 1.0;
        
        // Offset Y to push the entire beam down below the search bar
        uv.y += 0.3;

        // X coordinate normalized purely 0 to 1 from center to edge
        float normX = abs(gl_FragCoord.xy.x / u_resolution.x * 2.0 - 1.0);

        float t = u_time * 0.15;

        // Thickness profile: Very tight in the center, aggressively expanding to the sides.
        // At normX = 1.0 (screen edge), thickness is 1.6, meaning it covers more than the full height.
        float thickness = 0.015 + 1.6 * pow(normX, 2.2);

        // A gentle organic wave
        float wave = sin(uv.x * 2.0 - t) * 0.02;
        
        // Mouse warp
        float mouseDist = length(uv - u_mouse);
        float mouseWarp = exp(-mouseDist * 5.0) * 0.15 * sin(mouseDist * 10.0 - u_time * 4.0);

        // Distance from the centerline
        float yDist = abs(uv.y - wave + mouseWarp);

        // Volumetric Fill using smoothstep to guarantee physical expansion
        // Core white fill
        float core = 1.0 - smoothstep(thickness * 0.02, thickness * 0.25, yDist);
        // Bright purple mid-glow
        float midGlow = 1.0 - smoothstep(thickness * 0.1, thickness * 0.7, yDist);
        // Deep purple wide glow
        float wideGlow = 1.0 - smoothstep(thickness * 0.3, thickness * 2.5, yDist);

        // Colors
        vec3 darkBg = vec3(0.04, 0.03, 0.08); 
        vec3 darkPurple = vec3(0.25, 0.05, 0.5);
        vec3 brightPurple = vec3(0.65, 0.25, 1.0);
        vec3 whiteCore = vec3(1.0, 0.95, 1.0);

        // Layer the colors
        vec3 color = darkBg;
        color = mix(color, darkPurple, wideGlow);
        color = mix(color, brightPurple, midGlow);
        color = mix(color, whiteCore, core);

        // Add an intensely bright additive line exactly on the center to make it "burn"
        float hotLine = 0.005 / (yDist + 0.005);
        color += whiteCore * hotLine * 0.6;

        // Vignette to darken corners
        float vignette = 1.0 - dot(uv * 0.3, uv * 0.3);
        color *= max(0.0, vignette);

        // Cinematic film grain
        float grain = (hash(gl_FragCoord.xy + vec2(u_time)) - 0.5) * 0.03;
        color += vec3(grain);

        gl_FragColor = vec4(color, 1.0);
      }
    `;

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

    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("Program linking error:", gl.getProgramInfoLog(program));
      return;
    }

    gl.useProgram(program);

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
    const mouseLoc = gl.getUniformLocation(program, 'u_mouse');

    let animationFrameId;
    let startTime = Date.now();
    
    let mouseX = -10.0;
    let mouseY = -10.0;

    const handleMouseMove = (e) => {
      const nx = (e.clientX / window.innerWidth) * 2.0 - 1.0;
      const ny = -((e.clientY / window.innerHeight) * 2.0 - 1.0);
      const aspect = window.innerWidth / window.innerHeight;
      mouseX = nx * aspect;
      mouseY = ny;
    };

    window.addEventListener('mousemove', handleMouseMove);

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

    let smoothedMouseX = -10.0;
    let smoothedMouseY = -10.0;

    const render = () => {
      const elapsedSeconds = (Date.now() - startTime) / 1000.0;
      
      smoothedMouseX += (mouseX - smoothedMouseX) * 0.05;
      smoothedMouseY += (mouseY - smoothedMouseY) * 0.05;

      gl.uniform2f(resolutionLoc, canvas.width, canvas.height);
      gl.uniform1f(timeLoc, elapsedSeconds);
      gl.uniform2f(mouseLoc, smoothedMouseX, smoothedMouseY);

      gl.drawArrays(gl.TRIANGLES, 0, 6);

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
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
      className="fixed inset-0 w-full h-full z-[-2] bg-[#0b0616] pointer-events-none"
    />
  );
}
