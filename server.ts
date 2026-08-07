import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Allow large payloads for image base64 uploads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Lazy helper for Gemini Client
function getAiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY no está configurada en las variables de entorno.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// AI Blueprint Recognition Route
app.post("/api/detect-blueprint-elements", async (req, res) => {
  try {
    const { imageBase64, mimeType = "image/jpeg" } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: "No se proporcionó la imagen en base64" });
    }

    // Sanitize base64
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    const prompt = `
Eres un Ingeniero Senior de Inspección de Obras Subterráneas, Redes Eléctricas y Telecomunicaciones.
Realiza un ANÁLISIS ÓPTICO DE ALTA PRECISIÓN Y EXHAUSTIVO sobre el plano adjunto para identificar y catalogar TODAS las cámaras de inspección, cajas, pozos y tramos de canalización, con ESPECIAL ÉNFASIS EN DETECTAR RECUADROS Y CAJAS AUNQUE APAREZCAN DISTORSIONADAS.

INSTRUCCIONES CLAVE DE DETECCIÓN PARA CUADROS DISTORSIONADOS O DE BAJA RESOLUCIÓN:
1. EXAMINAR Y LOCALIZAR TODOS LOS MARCOS / CUADROS / CAJAS:
   - Detecta CUALQUIER marco, recuadro, polígono cuadrilátero o caja de inspección en el plano, AUN CUANDO esté:
     a) Distorsionado, inclinado, deformado o rotado por el escaneo o toma fotográfica en ángulo.
     b) Con líneas delgadas, tenues, borrosas, pixeladas o parcialmente cortadas.
     c) Con texto interno distorsionado o borroso (ej. 'MT', 'BT', 'D', 'C-01', 'POZO', 'SB850', 'SB858', 'CAM').
     d) Con achurado interior, tramas o sombras.
   - No omitas ningún cuadro por tener imperfecciones geométricas o distorsión óptica.

2. CLASIFICACIÓN TÉCNICA Y NORMATIVA DE CAJAS:
   - MEDIA TENSIÓN ("MT"): Cajas/Marcos rectangulares o cuadrados de color ROSA/MAGENTA, PÚRPURA o ROJO, o con inscripción 'MT' / 'M.T.'.
   - BAJA TENSIÓN ("BT"): Cajas/Marcos de color ROSA/MAGENTA o VERDE, o con inscripción 'BT' / 'B.T.'.
   - DATOS Y TELECOMUNICACIONES ("D"): Cajas/Marcos de color AZUL, ícono de red o inscripción 'D' / 'DATOS' / 'FO'.
   - Si la inscripción interna es difícil de leer por distorsión, clasifica la cámara según el color dominante del marco o el tipo de línea/canalización conectada.

3. TRAMOS DE CANALIZACIÓN Y TUBERÍAS:
   - Identifica líneas continuas o punteadas que interconecten las cámaras.
   - Extrae el diámetro de tuberías (ej. 2x4 pulg, 4x4 pulg, 1x2 pulg), tipo de conductor y distancia en metros.

SISTEMA DE COORDENADAS RELATIVAS (0 a 1000):
- x = 0 (borde izquierdo), x = 1000 (borde derecho).
- y = 0 (borde superior), y = 1000 (borde inferior).
- Retorna las coordenadas del centro (xRatio, yRatio de 0 a 1000) y el tamaño aproximado del recuadro (widthRatio, heightRatio).

EXIGENCIA FORMATO DE SALIDA Y REGLA JSON SINTAXIS CRÍTICA:
- No utilices comillas dobles (") dentro de los valores de texto. Usa siempre comillas simples (') o la palabra 'pulg' para medidas.
Examina minuciosamente la imagen de esquina a esquina. Retorna todos los cuadros y canalizaciones encontrados.
`;

    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: {
        parts: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType: mimeType,
            },
          },
          { text: prompt },
        ],
      },
      config: {
        responseMimeType: "application/json",
        temperature: 0.1,
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            detectedElements: {
              type: Type.ARRAY,
              description: "Lista de cámaras y cajas de inspección detectadas",
              items: {
                type: Type.OBJECT,
                properties: {
                  code: { type: Type.STRING, description: "Código ej. CAM-MT-01, CAM-BT-02, CAM-D-01" },
                  norm: { type: Type.STRING, description: "Tipo de norma: MT, BT, D, SB850, SB858, SB851" },
                  status: { type: Type.STRING, description: "Estado: Terminado, En proceso, Pendiente" },
                  xRatio: { type: Type.NUMBER, description: "Coordenada X centro de 0 a 1000" },
                  yRatio: { type: Type.NUMBER, description: "Coordenada Y centro de 0 a 1000" },
                  widthRatio: { type: Type.NUMBER, description: "Ancho estimado de 0 a 1000" },
                  heightRatio: { type: Type.NUMBER, description: "Alto estimado de 0 a 1000" },
                  details: { type: Type.STRING, description: "Análisis técnico de la cámara" },
                  dimensions: { type: Type.STRING, description: "Dimensiones estimadas ej. 1.20 x 1.20 x 1.40 m" },
                  confidence: { type: Type.NUMBER, description: "Confianza de 0 a 100" },
                  nearbyText: { type: Type.STRING, description: "Texto cercano en el plano" }
                },
                required: ["code", "norm", "xRatio", "yRatio"],
              },
            },
            detectedLines: {
              type: Type.ARRAY,
              description: "Tramos de canalizaciones entre cámaras",
              items: {
                type: Type.OBJECT,
                properties: {
                  label: { type: Type.STRING, description: "Etiqueta ej. T-MT-01, T-BT-01" },
                  x1Ratio: { type: Type.NUMBER, description: "X inicio 0-1000" },
                  y1Ratio: { type: Type.NUMBER, description: "Y inicio 0-1000" },
                  x2Ratio: { type: Type.NUMBER, description: "X fin 0-1000" },
                  y2Ratio: { type: Type.NUMBER, description: "Y fin 0-1000" },
                  meters: { type: Type.NUMBER, description: "Metros estimados del tramo" },
                  pipes: { type: Type.STRING, description: "Especificación de ductos ej. 2x4 pulg PVC" },
                  cables: { type: Type.STRING, description: "Especificación de conductor ej. 3x1/0 XLPE 15kV" },
                  networkType: { type: Type.STRING, description: "Red: MT, BT o D" },
                  confidence: { type: Type.NUMBER, description: "Confianza de 0 a 100" }
                },
                required: ["label", "x1Ratio", "y1Ratio", "x2Ratio", "y2Ratio"],
              },
            },
            summary: { type: Type.STRING, description: "Diagnóstico técnico de ingeniería" },
            counts: {
              type: Type.OBJECT,
              properties: {
                mtCount: { type: Type.NUMBER },
                btCount: { type: Type.NUMBER },
                dCount: { type: Type.NUMBER },
                totalCameras: { type: Type.NUMBER },
                totalLines: { type: Type.NUMBER },
                totalMeters: { type: Type.NUMBER }
              },
            },
          },
          required: ["detectedElements"],
        },
      },
    });

    const rawText = response.text || "{}";
    let result;
    try {
      result = JSON.parse(rawText);
    } catch (parseErr) {
      console.warn("Fallo el parseo JSON directo de Gemini, aplicando limpieza de sintaxis:", parseErr);
      // Clean markdown code blocks and trailing commas or unescaped quotes
      let cleaned = rawText.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) {
        cleaned = match[0];
      }
      // Remove trailing commas before closing braces/brackets
      cleaned = cleaned.replace(/,\s*([}\]])/g, "$1");
      try {
        result = JSON.parse(cleaned);
      } catch (secondErr) {
        // Fallback: replace any inner unescaped double quotes that are not JSON structural delimiters
        console.error("Respuesta cruda de Gemini con error:", rawText);
        throw new Error("Respuesta de IA con formato JSON inválido. Reintenta la detección.");
      }
    }

    res.json(result);
  } catch (err: any) {
    console.error("Error en reconocimiento IA del plano:", err);
    res.status(500).json({ error: err.message || "Error al procesar la imagen con Gemini API" });
  }
});

// Vite Middleware & Production Serving
async function start() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor de obra ejecutándose en puerto ${PORT}`);
  });
}

start();
