"use client";
import { useState, useCallback } from "react";
import { Image as ImageIcon, Wand2, Sparkles, Download, RefreshCw, ChevronDown, Palette } from "lucide-react";
import Image from "next/image";

function cn(...classes: (string | undefined | false | null)[]) {
  return classes.filter(Boolean).join(" ");
}

const STYLES = [
  { id: "realistic", label: "Photorealistic", emoji: "📸" },
  { id: "digital-art", label: "Digital Art", emoji: "🎨" },
  { id: "oil-painting", label: "Oil Painting", emoji: "🖌️" },
  { id: "watercolor", label: "Watercolor", emoji: "💧" },
  { id: "cyberpunk", label: "Cyberpunk", emoji: "🌆" },
  { id: "anime", label: "Anime", emoji: "⛩️" },
  { id: "minimalist", label: "Minimalist", emoji: "◻️" },
  { id: "3d-render", label: "3D Render", emoji: "🎭" },
];

const EXAMPLE_PROMPTS = [
  "A majestic dragon soaring over snow-capped mountains at dawn",
  "Futuristic Tokyo street at night with neon signs and rain",
  "A cozy cottage in an enchanted forest with glowing fireflies",
  "Abstract geometric art with deep purple and gold colors",
  "Portrait of a scientist in a high-tech lab surrounded by holograms",
  "Ocean waves crashing on a black sand beach during sunset",
];

type GeneratedImage = {
  url: string;
  seed: string;
};

export default function ImagePage() {
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("realistic");
  const [isLoading, setIsLoading] = useState(false);
  const [enhancedPrompt, setEnhancedPrompt] = useState("");
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [selectedImage, setSelectedImage] = useState<number | null>(null);
  const [error, setError] = useState("");

  const generate = useCallback(async (customPrompt?: string) => {
    const finalPrompt = customPrompt || prompt;
    if (!finalPrompt.trim() || isLoading) return;

    setIsLoading(true);
    setError("");
    setImages([]);
    setEnhancedPrompt("");
    setSelectedImage(null);

    try {
      const response = await fetch("/api/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: finalPrompt.trim(), style }),
      });

      const data = await response.json();

      if (data.error) throw new Error(data.error);

      setEnhancedPrompt(data.enhancedPrompt);
      setImages(
        (data.placeholderImages as string[]).map((url, i) => ({
          url,
          seed: `seed-${i}`,
        }))
      );
      setSelectedImage(0);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [prompt, style, isLoading]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-[var(--border)] flex-shrink-0" style={{ background: "var(--bg-secondary)" }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-pink-600 to-rose-600 flex items-center justify-center">
            <ImageIcon className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-white">Image AI</h1>
            <p className="text-xs text-[var(--text-muted)]">Transform text into stunning visuals</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-[380px,1fr]">
        {/* Left panel — controls */}
        <div className="flex flex-col border-r border-[var(--border)] overflow-y-auto" style={{ background: "var(--bg-secondary)" }}>
          <div className="p-4 space-y-4">
            {/* Prompt input */}
            <div>
              <label className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-2 block">Your Prompt</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the image you want to create..."
                rows={4}
                className="w-full px-4 py-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-sm text-white placeholder:text-[var(--text-muted)] outline-none resize-none focus:border-pink-500/50 transition-all"
              />
            </div>

            {/* Enhanced prompt display */}
            {enhancedPrompt && (
              <div className="p-3 rounded-xl bg-pink-500/5 border border-pink-500/20">
                <div className="flex items-center gap-1.5 mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                  <span className="text-xs text-pink-400 font-medium">AI-Enhanced Prompt</span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{enhancedPrompt}</p>
              </div>
            )}

            {/* Style selector */}
            <div>
              <label className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-2 flex items-center gap-1">
                <Palette className="w-3 h-3" />
                Art Style
              </label>
              <div className="grid grid-cols-2 gap-2">
                {STYLES.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setStyle(s.id)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-xl border text-left transition-all text-sm",
                      style === s.id
                        ? "bg-pink-500/15 border-pink-500/30 text-pink-300"
                        : "border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--text-muted)] hover:text-white"
                    )}
                  >
                    <span>{s.emoji}</span>
                    <span className="text-xs">{s.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Generate button */}
            <button
              onClick={() => generate()}
              disabled={!prompt.trim() || isLoading}
              className={cn(
                "w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all",
                prompt.trim() && !isLoading
                  ? "bg-gradient-to-r from-pink-600 to-rose-600 text-white hover:shadow-lg hover:shadow-pink-500/20"
                  : "bg-[var(--bg-hover)] text-[var(--text-muted)] cursor-not-allowed"
              )}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Enhancing & Generating...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  Generate 4 Images
                </>
              )}
            </button>

            {/* Examples */}
            <div>
              <label className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-2 block">Inspiration</label>
              <div className="space-y-1.5">
                {EXAMPLE_PROMPTS.map((ex, i) => (
                  <button
                    key={i}
                    onClick={() => { setPrompt(ex); generate(ex); }}
                    className="w-full flex items-start gap-2 px-3 py-2 rounded-lg text-left text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-white transition-all"
                  >
                    <ImageIcon className="w-3.5 h-3.5 text-pink-400 flex-shrink-0 mt-0.5" />
                    <span>{ex}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right panel — output */}
        <div className="flex flex-col overflow-y-auto" style={{ background: "var(--bg-primary)" }}>
          {images.length > 0 ? (
            <div className="p-6 space-y-6">
              {/* Main selected image */}
              {selectedImage !== null && (
                <div className="relative aspect-square max-w-lg mx-auto rounded-2xl overflow-hidden border border-[var(--border)] group">
                  <Image
                    src={images[selectedImage].url}
                    alt="AI generated image"
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-4 gap-3">
                    <a
                      href={images[selectedImage].url}
                      download
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 backdrop-blur-sm text-white text-sm hover:bg-white/20 transition-all"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </a>
                    <button
                      onClick={() => generate()}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-pink-500/80 backdrop-blur-sm text-white text-sm hover:bg-pink-500 transition-all"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Regenerate
                    </button>
                  </div>
                </div>
              )}

              {/* Grid thumbnails */}
              <div className="grid grid-cols-4 gap-3 max-w-lg mx-auto">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(i)}
                    className={cn(
                      "relative aspect-square rounded-xl overflow-hidden border-2 transition-all",
                      selectedImage === i
                        ? "border-pink-500 shadow-lg shadow-pink-500/30"
                        : "border-[var(--border)] hover:border-pink-500/40"
                    )}
                  >
                    <Image src={img.url} alt={`Variation ${i + 1}`} fill className="object-cover" />
                  </button>
                ))}
              </div>
            </div>
          ) : isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="relative w-20 h-20 mx-auto mb-6">
                  <div className="absolute inset-0 rounded-full border-2 border-pink-500/20 animate-ping" />
                  <div className="absolute inset-2 rounded-full border-2 border-pink-500/40 animate-ping animation-delay-200" />
                  <div className="w-full h-full rounded-full bg-gradient-to-br from-pink-600 to-rose-600 flex items-center justify-center">
                    <Sparkles className="w-8 h-8 text-white" />
                  </div>
                </div>
                <p className="text-lg font-semibold text-white mb-1">Creating your masterpiece...</p>
                <p className="text-sm text-[var(--text-secondary)]">Enhancing your prompt and generating 4 variations</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-center p-8">
              <div>
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-pink-900/40 to-rose-900/40 border border-pink-500/20 flex items-center justify-center mx-auto mb-4">
                  <ImageIcon className="w-10 h-10 text-pink-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Create stunning images with AI</h3>
                <p className="text-sm text-[var(--text-secondary)] max-w-sm mx-auto mb-6">
                  Describe any image you can imagine. AIverse will enhance your prompt and generate 4 unique variations.
                </p>
                {error && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm max-w-sm mx-auto">
                    {error}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
