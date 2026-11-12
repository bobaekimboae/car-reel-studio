import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown, ArrowLeft, ArrowRight, Check, ChevronDown, Clapperboard,
  Download, FileImage, ImagePlus, Info, LoaderCircle, Pause, Play,
  Plus, RotateCcw, Sparkles, Trash2, Upload, VolumeX, X,
} from "lucide-react";

const MAX_PHOTOS = 20;
const MAX_SELECTED = 8;
const THEMES = {
  moss: { label: "숲빛", accent: "#b9e887", ink: "#17331f", wash: "#eef4e8" },
  cream: { label: "웜 페이퍼", accent: "#f1b184", ink: "#382519", wash: "#f7eee5" },
  night: { label: "딥 네이비", accent: "#8cc7ff", ink: "#101b31", wash: "#e9edf5" },
};

const emptyVehicle = {
  make: "", model: "", trim: "", year: "", mileage: "", price: "",
  fuel: "", transmission: "", color: "", dealer: "",
};

function makeSceneLines(vehicle, index, total) {
  const title = [vehicle.make, vehicle.model, vehicle.trim].filter(Boolean).join(" ") || "오늘의 추천 차량";
  const year = vehicle.year ? `${vehicle.year}년식` : "꼼꼼히 확인한 매물";
  const mileage = vehicle.mileage ? `${Number(vehicle.mileage.replaceAll(",", "")).toLocaleString("ko-KR")}km 주행` : "사진으로 만나보세요";
  const closing = index === total - 1 ? "지금 문의해 보세요" : "디테일까지 확인해 보세요";
  const lines = [
    { kicker: "오늘의 매물", title, detail: [year, vehicle.fuel].filter(Boolean).join(" · ") },
    { kicker: "주행 정보", title: mileage, detail: [vehicle.transmission, vehicle.color].filter(Boolean).join(" · ") || "차량 상태를 영상으로 확인하세요" },
    { kicker: "차량 포인트", title: vehicle.trim || "매력적인 디자인", detail: "실물 사진으로 확인하는 차량 컨디션" },
    { kicker: "가격 안내", title: vehicle.price ? `${Number(vehicle.price.replaceAll(",", "")).toLocaleString("ko-KR")}만원` : "합리적인 매물", detail: "상세 조건은 상담으로 안내해 드립니다" },
    { kicker: "상담 안내", title: closing, detail: vehicle.dealer || "편하게 문의해 주세요" },
  ];
  return lines[index % lines.length];
}

function coverImage(ctx, image, width, height, progress = 0) {
  const scale = Math.max(width / image.width, height / image.height) * (1.04 + progress * 0.09);
  const w = image.width * scale;
  const h = image.height * scale;
  const pan = Math.sin(progress * Math.PI) * Math.min(26, width * 0.05);
  ctx.drawImage(image, (width - w) / 2 + pan, (height - h) / 2, w, h);
}

function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 2) {
  const words = String(text || "").split(" ");
  let line = "";
  let row = 0;
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && line) {
      ctx.fillText(line, x, y + row * lineHeight, maxWidth);
      row += 1;
      line = word;
      if (row >= maxLines - 1) break;
    } else line = candidate;
  }
  if (line && row < maxLines) ctx.fillText(line, x, y + row * lineHeight, maxWidth);
}

function drawFrame(canvas, image, scene, vehicle, theme, progress, photoIndex, totalPhotos, showPrice, logoImage) {
  if (!canvas || !image) return;
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  coverImage(ctx, image, w, h, progress);

  const topFade = ctx.createLinearGradient(0, 0, 0, h * 0.5);
  topFade.addColorStop(0, "rgba(8, 14, 10, .63)");
  topFade.addColorStop(1, "rgba(8, 14, 10, 0)");
  ctx.fillStyle = topFade;
  ctx.fillRect(0, 0, w, h * 0.55);

  const lowerFade = ctx.createLinearGradient(0, h * 0.42, 0, h);
  lowerFade.addColorStop(0, "rgba(8, 14, 10, 0)");
  lowerFade.addColorStop(0.34, "rgba(8, 14, 10, .38)");
  lowerFade.addColorStop(1, "rgba(8, 14, 10, .88)");
  ctx.fillStyle = lowerFade;
  ctx.fillRect(0, h * 0.4, w, h * 0.6);

  const palette = THEMES[theme] || THEMES.moss;
  ctx.fillStyle = palette.accent;
  ctx.beginPath();
  ctx.roundRect(36, 42, 9, 34, 5);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,.94)";
  ctx.font = "600 24px Pretendard, Arial, sans-serif";
  ctx.fillText(`${photoIndex + 1} / ${totalPhotos}`, 62, 68);

  const vehicleTitle = [vehicle.make, vehicle.model].filter(Boolean).join(" ") || "차량 매물 소개";
  ctx.fillStyle = "#fff";
  ctx.font = "700 54px Pretendard, Arial, sans-serif";
  wrapCanvasText(ctx, scene.title || vehicleTitle, 42, h - 302, w - 84, 66, 2);
  ctx.fillStyle = palette.accent;
  ctx.font = "700 23px Pretendard, Arial, sans-serif";
  ctx.fillText(scene.kicker || "차량 소개", 44, h - 164);
  ctx.fillStyle = "rgba(255,255,255,.92)";
  ctx.font = "500 25px Pretendard, Arial, sans-serif";
  wrapCanvasText(ctx, scene.detail || "사진으로 살펴보는 차량의 매력", 44, h - 118, w - 88, 36, 2);

  const meta = [vehicle.year && `${vehicle.year}년식`, vehicle.mileage && `${Number(vehicle.mileage.replaceAll(",", "")).toLocaleString("ko-KR")}km`, showPrice && vehicle.price && `${Number(vehicle.price.replaceAll(",", "")).toLocaleString("ko-KR")}만원`].filter(Boolean).join("  ·  ");
  if (meta) {
    ctx.fillStyle = "rgba(255,255,255,.78)";
    ctx.font = "500 18px Pretendard, Arial, sans-serif";
    ctx.fillText(meta, 44, h - 38, w - 88);
  }
  if (logoImage) {
    const ratio = Math.min(108 / logoImage.width, 52 / logoImage.height);
    const logoW = logoImage.width * ratio;
    const logoH = logoImage.height * ratio;
    ctx.fillStyle = "rgba(255,255,255,.94)";
    ctx.beginPath();
    ctx.roundRect(w - logoW - 34, 34, logoW + 18, logoH + 18, 12);
    ctx.fill();
    ctx.drawImage(logoImage, w - logoW - 25, 43, logoW, logoH);
  }
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function Field({ label, value, onChange, placeholder, suffix, type = "text" }) {
  return (
    <label className="field">
      <span>{label}</span>
      <div className="input-wrap">
        <input type={type} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
        {suffix && <small>{suffix}</small>}
      </div>
    </label>
  );
}

export function App() {
  const [vehicle, setVehicle] = useState(emptyVehicle);
  const [photos, setPhotos] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [scenes, setScenes] = useState({});
  const [theme, setTheme] = useState("moss");
  const [logo, setLogo] = useState(null);
  const [showPrice, setShowPrice] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [currentScene, setCurrentScene] = useState(0);
  const [videoUrl, setVideoUrl] = useState("");
  const [videoType, setVideoType] = useState("");
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [notice, setNotice] = useState("");
  const inputRef = useRef(null);
  const logoRef = useRef(null);
  const canvasRef = useRef(null);
  const mediaVideoRef = useRef(null);

  const selectedPhotos = useMemo(() => photos.filter((photo) => selectedIds.includes(photo.id)), [selectedIds, photos]);
  const activePhoto = selectedPhotos[currentScene] || selectedPhotos[0];

  const updateVehicle = (key, value) => setVehicle((previous) => ({ ...previous, [key]: value }));
  const getScene = useCallback((photo, index, count) => scenes[photo?.id] || makeSceneLines(vehicle, index, count), [scenes, vehicle]);

  const addPhotos = (files) => {
    const available = MAX_PHOTOS - photos.length;
    const accepted = Array.from(files).filter((file) => file.type.startsWith("image/")).slice(0, available);
    if (!accepted.length) {
      setNotice(photos.length >= MAX_PHOTOS ? "사진은 최대 20장까지 추가할 수 있습니다." : "JPG, PNG 또는 WebP 사진을 선택해 주세요.");
      return;
    }
    const added = accepted.map((file) => ({ id: crypto.randomUUID(), file, url: URL.createObjectURL(file), name: file.name }));
    setPhotos((previous) => [...previous, ...added]);
    setSelectedIds((previous) => [...previous, ...added.map((photo) => photo.id)].slice(0, MAX_SELECTED));
    setCurrentScene(0);
    setVideoUrl("");
    setNotice(accepted.length < files.length ? `최대 ${MAX_PHOTOS}장까지 등록되어 ${accepted.length}장을 추가했습니다.` : "사진을 추가했습니다. 영상에 넣을 사진을 선택해 주세요.");
  };

  const removePhoto = (id) => {
    setPhotos((previous) => {
      const photo = previous.find((item) => item.id === id);
      if (photo) URL.revokeObjectURL(photo.url);
      return previous.filter((item) => item.id !== id);
    });
    setSelectedIds((previous) => previous.filter((item) => item !== id));
    setScenes((previous) => { const next = { ...previous }; delete next[id]; return next; });
    setVideoUrl("");
    setCurrentScene(0);
  };

  const togglePhoto = (id) => {
    setVideoUrl("");
    setSelectedIds((previous) => {
      if (previous.includes(id)) return previous.filter((item) => item !== id);
      if (previous.length >= MAX_SELECTED) {
        setNotice(`영상에는 사진을 최대 ${MAX_SELECTED}장까지 넣을 수 있습니다.`);
        return previous;
      }
      return [...previous, id];
    });
  };

  const movePhoto = (id, direction) => {
    setPhotos((previous) => {
      const index = previous.findIndex((photo) => photo.id === id);
      const target = index + direction;
      if (target < 0 || target >= previous.length) return previous;
      const next = [...previous];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setVideoUrl("");
  };

  const generateCaptions = () => {
    setScenes((previous) => {
      const next = { ...previous };
      selectedPhotos.forEach((photo, index) => { next[photo.id] = makeSceneLines(vehicle, index, selectedPhotos.length); });
      return next;
    });
    setNotice("장면 문구를 차량 정보에 맞춰 채웠습니다. 각 문구는 직접 수정할 수 있습니다.");
  };

  const updateScene = (photoId, key, value, sceneIndex) => {
    setScenes((previous) => ({ ...previous, [photoId]: { ...(previous[photoId] || makeSceneLines(vehicle, sceneIndex, selectedPhotos.length)), [key]: value } }));
    setVideoUrl("");
  };

  useEffect(() => {
    let cancelled = false;
    let frameId;
    let startedAt = 0;
    const paint = async () => {
      if (!activePhoto || !canvasRef.current) return;
      const image = await loadImage(activePhoto.url).catch(() => null);
      const logoImage = logo?.url ? await loadImage(logo.url).catch(() => null) : null;
      if (cancelled || !image) return;
      const run = (now) => {
        if (cancelled) return;
        if (!startedAt) startedAt = now;
        const progress = playing ? ((now - startedAt) % 3600) / 3600 : 0.18;
        drawFrame(canvasRef.current, image, getScene(activePhoto, currentScene, selectedPhotos.length), vehicle, theme, progress, currentScene, selectedPhotos.length, showPrice, logoImage);
        if (playing) frameId = requestAnimationFrame(run);
      };
      frameId = requestAnimationFrame(run);
    };
    if (!videoUrl) paint();
    return () => { cancelled = true; cancelAnimationFrame(frameId); };
  }, [activePhoto, currentScene, selectedPhotos.length, scenes, vehicle, theme, showPrice, logo, playing, videoUrl, getScene]);

  useEffect(() => {
    if (!playing || selectedPhotos.length < 2) return undefined;
    const timer = window.setInterval(() => setCurrentScene((index) => (index + 1) % selectedPhotos.length), 3600);
    return () => window.clearInterval(timer);
  }, [playing, selectedPhotos.length]);

  useEffect(() => () => {
    photos.forEach((photo) => URL.revokeObjectURL(photo.url));
    if (logo?.url) URL.revokeObjectURL(logo.url);
    if (videoUrl) URL.revokeObjectURL(videoUrl);
  }, []);

  const setLogoFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
      setNotice("로고는 5MB 이하의 이미지 파일을 선택해 주세요.");
      return;
    }
    setLogo((previous) => {
      if (previous?.url) URL.revokeObjectURL(previous.url);
      return { file, url: URL.createObjectURL(file) };
    });
  };

  const createVideo = async () => {
    if (selectedPhotos.length < 2) {
      setNotice("영상에 사용할 사진을 2장 이상 선택해 주세요.");
      return;
    }
    if (!canvasRef.current?.captureStream || !window.MediaRecorder) {
      setNotice("현재 브라우저는 영상 내보내기를 지원하지 않습니다. 최신 Chrome, Edge 또는 Safari를 사용해 주세요.");
      return;
    }
    setIsRendering(true);
    setRenderProgress(0);
    setVideoUrl("");
    setPlaying(false);
    const canvas = canvasRef.current;
    let scenesToRender;
    let logoImage;
    try {
      scenesToRender = await Promise.all(selectedPhotos.map(async (photo, index) => ({
        photo,
        image: await loadImage(photo.url),
        scene: getScene(photo, index, selectedPhotos.length),
      })));
      logoImage = logo?.url ? await loadImage(logo.url).catch(() => null) : null;
    } catch {
      setIsRendering(false);
      setNotice("사진을 읽을 수 없습니다. 다른 JPG, PNG 또는 WebP 파일로 다시 시도해 주세요.");
      return;
    }
    const mimeCandidates = ["video/mp4;codecs=avc1.42E01E", "video/mp4", "video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
    const mimeType = mimeCandidates.find((type) => MediaRecorder.isTypeSupported(type)) || "";
    const stream = canvas.captureStream(30);
    let recorder;
    try {
      recorder = new MediaRecorder(stream, mimeType ? { mimeType, videoBitsPerSecond: 6_000_000 } : undefined);
    } catch {
      stream.getTracks().forEach((track) => track.stop());
      setIsRendering(false);
      setNotice("이 브라우저의 영상 인코더를 사용할 수 없습니다.");
      return;
    }
    const chunks = [];
    const durationPerScene = 3200;
    const totalDuration = durationPerScene * scenesToRender.length;
    recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
    recorder.onerror = () => {
      stream.getTracks().forEach((track) => track.stop());
      setIsRendering(false);
      setNotice("영상 생성 중 오류가 발생했습니다. 사진 수를 줄여 다시 시도해 주세요.");
    };
    recorder.onstop = () => {
      stream.getTracks().forEach((track) => track.stop());
      const blob = new Blob(chunks, { type: recorder.mimeType || mimeType || "video/webm" });
      const url = URL.createObjectURL(blob);
      setVideoUrl(url);
      setVideoType(blob.type.includes("mp4") ? "mp4" : "webm");
      setIsRendering(false);
      setRenderProgress(100);
      setNotice("영상이 완성됐습니다. 미리보기 후 내려받을 수 있습니다.");
    };
    recorder.start(250);
    const start = performance.now();
    const render = (now) => {
      const elapsed = now - start;
      const globalProgress = Math.min(elapsed / totalDuration, 1);
      const sceneIndex = Math.min(Math.floor(elapsed / durationPerScene), scenesToRender.length - 1);
      const sceneProgress = (elapsed % durationPerScene) / durationPerScene;
      const current = scenesToRender[sceneIndex];
      drawFrame(canvas, current.image, current.scene, vehicle, theme, sceneProgress, sceneIndex, scenesToRender.length, showPrice, logoImage);
      setRenderProgress(Math.round(globalProgress * 100));
      if (elapsed >= totalDuration) {
        drawFrame(canvas, scenesToRender.at(-1).image, scenesToRender.at(-1).scene, vehicle, theme, 1, scenesToRender.length - 1, scenesToRender.length, showPrice, logoImage);
        recorder.stop();
        return;
      }
      requestAnimationFrame(render);
    };
    requestAnimationFrame(render);
  };

  const downloadVideo = () => {
    if (!videoUrl) return;
    const anchor = document.createElement("a");
    anchor.href = videoUrl;
    anchor.download = `${[vehicle.make, vehicle.model].filter(Boolean).join("-") || "차량-숏폼"}.${videoType || "webm"}`;
    anchor.click();
  };

  const photoSelectLabel = selectedPhotos.length ? `${selectedPhotos.length}장 선택` : "선택된 사진 없음";

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="wordmark" href="#top" aria-label="차량 숏폼 제작기 홈">
          <span className="brand-mark"><Clapperboard size={20} strokeWidth={2.4} /></span>
          <span>차량 숏폼 제작기</span>
        </a>
        <div className="topbar-note">사진을 고르고, 장면을 다듬어, 바로 내보내세요</div>
        <a className="help-link" href="#guide"><Info size={16} /> 사용 안내</a>
      </header>

      <main className="workspace" id="top">
        <section className="editor-column">
          <div className="intro-row">
            <div>
              <p className="eyebrow">차량 매물 영상 만들기</p>
              <h1>사진으로 만드는<br /><em>세로형 차량 소개 영상</em></h1>
              <p className="intro-copy">차량 정보와 사진을 입력하고, 장면 문구를 확인한 뒤 영상을 내보내세요.</p>
            </div>
            <div className="steps" aria-label="제작 순서">
              {["차량 정보", "사진 선택", "장면 문구", "미리보기"].map((step, index) => (
                <div className={`step ${index === 0 ? "active" : ""}`} key={step}>
                  <span>{String(index + 1).padStart(2, "0")}</span>{step}
                </div>
              ))}
            </div>
          </div>

          <section className="section-block vehicle-block" aria-labelledby="vehicle-title">
            <div className="section-heading">
              <div><span className="section-number">01</span><div><h2 id="vehicle-title">차량 정보</h2><p>영상에 표시할 기본 정보를 입력하세요.</p></div></div>
              <button className="text-action" onClick={() => setVehicle(emptyVehicle)}><RotateCcw size={15} /> 초기화</button>
            </div>
            <div className="vehicle-grid">
              <Field label="제조사" value={vehicle.make} onChange={(value) => updateVehicle("make", value)} placeholder="예: BMW" />
              <Field label="모델" value={vehicle.model} onChange={(value) => updateVehicle("model", value)} placeholder="예: X4" />
              <Field label="세부 트림" value={vehicle.trim} onChange={(value) => updateVehicle("trim", value)} placeholder="예: xDrive20i M 스포츠" />
              <Field label="연식" value={vehicle.year} onChange={(value) => updateVehicle("year", value)} placeholder="예: 2022" suffix="년식" />
              <Field label="주행거리" value={vehicle.mileage} onChange={(value) => updateVehicle("mileage", value)} placeholder="예: 32,000" suffix="km" />
              <Field label="판매 가격" value={vehicle.price} onChange={(value) => updateVehicle("price", value)} placeholder="예: 5,290" suffix="만원" />
              <label className="field"><span>연료</span><div className="input-wrap"><select value={vehicle.fuel} onChange={(event) => updateVehicle("fuel", event.target.value)}><option value="">선택</option><option>가솔린</option><option>디젤</option><option>하이브리드</option><option>전기</option><option>LPG</option></select><ChevronDown size={15} /></div></label>
              <label className="field"><span>변속기</span><div className="input-wrap"><select value={vehicle.transmission} onChange={(event) => updateVehicle("transmission", event.target.value)}><option value="">선택</option><option>자동</option><option>수동</option><option>CVT</option></select><ChevronDown size={15} /></div></label>
              <Field label="차량 색상" value={vehicle.color} onChange={(value) => updateVehicle("color", value)} placeholder="예: 사파이어 블랙" />
              <Field label="판매처 이름" value={vehicle.dealer} onChange={(value) => updateVehicle("dealer", value)} placeholder="영상에 표시할 상호" />
            </div>
            <div className="logo-row">
              <div className="logo-copy"><span className="logo-title">판매처 로고 <small>선택 사항 · 5MB 이하</small></span><span className="muted">로고를 넣으면 영상 오른쪽 위에 표시됩니다.</span></div>
              <div className="logo-control">
                {logo ? <><img src={logo.url} alt="업로드한 판매처 로고" /><span className="filename">{logo.file.name}</span><button className="icon-button small" aria-label="로고 삭제" onClick={() => { URL.revokeObjectURL(logo.url); setLogo(null); }}><X size={15} /></button></> : <button className="outline-button compact" onClick={() => logoRef.current?.click()}><ImagePlus size={16} /> 로고 추가</button>}
                <input ref={logoRef} hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => setLogoFile(event.target.files?.[0])} />
              </div>
            </div>
          </section>

          <section className="section-block photo-block" aria-labelledby="photos-title">
            <div className="section-heading">
              <div><span className="section-number">02</span><div><h2 id="photos-title">사진 선택 및 순서</h2><p>최대 20장을 추가하고 영상에 사용할 사진을 최대 8장 고르세요.</p></div></div>
              <span className="count-pill">{photoSelectLabel}</span>
            </div>
            <input ref={inputRef} hidden type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={(event) => { addPhotos(event.target.files || []); event.target.value = ""; }} />
            {photos.length === 0 ? (
              <button className="upload-zone" onClick={() => inputRef.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); addPhotos(event.dataTransfer.files); }}>
                <span className="upload-icon"><Upload size={21} /></span>
                <strong>차량 사진을 여기에 놓거나 선택하세요</strong>
                <span>JPG · PNG · WebP · 한 번에 최대 20장</span>
                <span className="upload-cta">사진 선택</span>
              </button>
            ) : (
              <>
                <div className="photo-toolbar"><span>{photos.length}장 등록됨 <i /> 영상 선택 {selectedPhotos.length}/{MAX_SELECTED}</span><button className="outline-button compact" onClick={() => inputRef.current?.click()} disabled={photos.length >= MAX_PHOTOS}><Plus size={15} /> 사진 추가</button></div>
                <div className="photo-grid">
                  {photos.map((photo, index) => {
                    const checked = selectedIds.includes(photo.id);
                    return <div className={`photo-card ${checked ? "chosen" : ""}`} key={photo.id}>
                      <button className="photo-thumb" onClick={() => togglePhoto(photo.id)} aria-pressed={checked} aria-label={`${photo.name} ${checked ? "선택 해제" : "영상에 선택"}`}><img src={photo.url} alt={photo.name} /><span className="selection-check">{checked ? <Check size={14} /> : index + 1}</span></button>
                      <div className="photo-meta"><span title={photo.name}>{photo.name}</span><div><button className="mini-icon" title="앞으로" disabled={index === 0} onClick={() => movePhoto(photo.id, -1)}><ArrowLeft size={13} /></button><button className="mini-icon" title="뒤로" disabled={index === photos.length - 1} onClick={() => movePhoto(photo.id, 1)}><ArrowRight size={13} /></button><button className="mini-icon danger" title="사진 삭제" onClick={() => removePhoto(photo.id)}><Trash2 size={13} /></button></div></div>
                    </div>;
                  })}
                  {photos.length < MAX_PHOTOS && <button className="add-photo-tile" onClick={() => inputRef.current?.click()}><Plus size={22} /><span>사진 추가</span></button>}
                </div>
              </>
            )}
          </section>

          <section className="section-block caption-block" aria-labelledby="captions-title">
            <div className="section-heading caption-heading">
              <div><span className="section-number">03</span><div><h2 id="captions-title">장면 문구 검토</h2><p>자동 작성한 기본 문구를 확인하고 원하는 내용으로 고치세요.</p></div></div>
              <button className="outline-button compact" onClick={generateCaptions} disabled={!selectedPhotos.length}><Sparkles size={15} /> 문구 채우기</button>
            </div>
            {selectedPhotos.length ? <div className="scene-list">
              {selectedPhotos.map((photo, index) => {
                const scene = getScene(photo, index, selectedPhotos.length);
                return <article className={`scene-row ${currentScene === index ? "scene-active" : ""}`} key={photo.id}>
                  <button className="scene-photo" onClick={() => { setCurrentScene(index); setVideoUrl(""); }} aria-label={`${index + 1}번 장면 미리보기`}><img src={photo.url} alt="" /><span>{String(index + 1).padStart(2, "0")}</span></button>
                  <div className="scene-fields">
                    <div className="scene-label"><span>장면 {index + 1}</span><small>{index * 3}–{(index + 1) * 3}초</small></div>
                    <input aria-label={`${index + 1}번 장면 제목`} value={scene.title} maxLength={40} onChange={(event) => updateScene(photo.id, "title", event.target.value, index)} placeholder="장면 제목" />
                    <input aria-label={`${index + 1}번 장면 설명`} value={scene.detail} maxLength={60} onChange={(event) => updateScene(photo.id, "detail", event.target.value, index)} placeholder="짧은 설명" />
                  </div>
                </article>;
              })}
            </div> : <div className="empty-scenes"><FileImage size={20} /><span>사진을 선택하면 장면 문구를 편집할 수 있습니다.</span></div>}
          </section>
          <div className="privacy-note"><Info size={16} /><span>사진과 차량 정보는 이 브라우저에서 영상으로 처리됩니다. 서버에 업로드하지 않습니다. 생성 영상에는 음성이나 배경 음악이 포함되지 않습니다.</span></div>
        </section>

        <aside className="preview-column" aria-label="영상 미리보기와 내보내기">
          <div className="preview-head"><div><p className="eyebrow">LIVE PREVIEW</p><h2>영상 미리보기</h2></div><span className="ratio-badge">세로 9:16</span></div>
          <div className="preview-frame">
            <div className="phone-screen">
              {videoUrl ? <video ref={mediaVideoRef} src={videoUrl} controls playsInline className="result-video" onPlay={() => setPlaying(false)} /> : <canvas ref={canvasRef} width="540" height="960" aria-label="선택한 사진으로 구성한 세로 영상 미리보기" />}
              {!selectedPhotos.length && !videoUrl && <div className="preview-empty"><span className="preview-empty-mark"><FileImage size={25} /></span><strong>사진을 추가하면<br />미리보기가 시작됩니다</strong><span>9:16 세로 영상</span></div>}
              {selectedPhotos.length > 0 && !videoUrl && <div className="preview-controls"><button className="play-control" onClick={() => setPlaying((value) => !value)} aria-label={playing ? "미리보기 멈춤" : "미리보기 재생"}>{playing ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" />}</button><div className="preview-dots">{selectedPhotos.map((photo, index) => <button className={index === currentScene ? "on" : ""} key={photo.id} aria-label={`${index + 1}번 장면`} onClick={() => { setCurrentScene(index); setVideoUrl(""); }} />)}</div><span>0:{String((currentScene + 1) * 3).padStart(2, "0")}</span></div>}
            </div>
          </div>
          <div className="preview-caption"><span className="preview-caption-dot" />{selectedPhotos.length ? `${selectedPhotos.length}개 장면 · 약 ${Math.round(selectedPhotos.length * 3.2)}초` : "사진을 올려 제작을 시작하세요"}</div>

          <div className="preview-options">
            <div className="option-heading"><span>영상 스타일</span><span>원하는 톤을 고르세요</span></div>
            <div className="theme-options">
              {Object.entries(THEMES).map(([key, value]) => <button className={`theme-choice ${theme === key ? "selected" : ""}`} key={key} onClick={() => { setTheme(key); setVideoUrl(""); }}><i style={{ background: value.accent, borderColor: value.ink }} />{value.label}</button>)}
            </div>
            <label className="switch-row"><span><strong>판매 가격 표시</strong><small>영상 하단에 가격을 표시합니다.</small></span><input type="checkbox" checked={showPrice} onChange={(event) => { setShowPrice(event.target.checked); setVideoUrl(""); }} /><i /></label>
          </div>

          {isRendering && <div className="rendering-panel"><div className="rendering-label"><span><LoaderCircle className="spin" size={16} /> 영상 만드는 중</span><b>{renderProgress}%</b></div><div className="progress-track"><i style={{ width: `${renderProgress}%` }} /></div><small>이 탭을 열어 두세요. 사진 수에 따라 잠시 걸릴 수 있습니다.</small></div>}
          {videoUrl && <button className="download-button" onClick={downloadVideo}><Download size={17} /> 영상 내려받기 <span>{videoType.toUpperCase()}</span></button>}
          <button className="create-button" onClick={createVideo} disabled={isRendering || selectedPhotos.length < 2}>{isRendering ? <><LoaderCircle className="spin" size={18} /> 영상 제작 중</> : <><Clapperboard size={18} /> 세로 영상 만들기</>}</button>
          <p className="export-hint"><VolumeX size={14} /> 무음 영상 · {videoType ? `${videoType.toUpperCase()} 파일` : "브라우저 지원 형식으로 저장"}</p>
          <div className="help-panel" id="guide"><strong>간단 사용 안내</strong><ol><li>차량 정보를 입력하고 사진을 추가하세요.</li><li>영상에 사용할 사진을 선택하고 순서를 정하세요.</li><li>장면 문구와 스타일을 확인한 뒤 영상을 만드세요.</li></ol></div>
        </aside>
      </main>

      <footer className="site-footer"><span>차량 숏폼 제작기</span><span>사진은 현재 브라우저에서만 처리됩니다.</span></footer>
      {notice && <div className="toast" role="status"><span>{notice}</span><button onClick={() => setNotice("")} aria-label="알림 닫기"><X size={15} /></button></div>}
    </div>
  );
}

