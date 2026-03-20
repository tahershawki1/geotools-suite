(function () {
  const STORAGE_KEY = "atlas_gate_level_state_v1";
  const TOLERANCE_METERS = 0.04;

  let points = [];
  let currentStep = 1;
  let globalMSM = 0;
  let stakingOffset = 0;
  let editingIndex = -1;
  let stakingImageData = "";
  let stakingImageName = "";

  function $(id) {
    return document.getElementById(id);
  }

  function safeValue(id) {
    const node = $(id);
    return node ? String(node.value || "") : "";
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      if (!file) {
        resolve("");
        return;
      }

      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  }

  function showToast(message) {
    const existing = document.querySelector(".toast");
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add("show"), 80);
    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 260);
    }, 2800);
  }

  function navigateToOverview() {
    if (typeof window.loadPage === "function") {
      window.loadPage("new-work");
      return;
    }
    window.location.href = "./new-work.html";
  }

  function navigateToHome() {
    if (typeof window.loadPage === "function") {
      window.loadPage("");
      return;
    }
    window.location.href = "../index.html";
  }

  function formatSigned(value, digits) {
    const number = Number(value) || 0;
    return `${number >= 0 ? "+" : ""}${number.toFixed(digits)}`;
  }
  function handleHeaderBack() {
    if (currentStep > 1) {
      nextStep(currentStep - 1, true);
      return;
    }
    navigateToOverview();
  }

  function resetPage() {
    if (!window.confirm("Ù‡Ù„ Ø£Ù†Øª Ù…ØªØ£ÙƒØ¯ Ù…Ù† Ù…Ø³Ø­ ÙƒØ§ÙØ© Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª ÙˆØ§Ù„Ø¨Ø¯Ø¡ Ù…Ù† Ø¬Ø¯ÙŠØ¯ØŸ")) {
      return;
    }
    localStorage.removeItem(STORAGE_KEY);
    window.location.reload();
  }

  function openPointModal() {
    const modal = $("pointModal");
    if (modal) {
      modal.classList.add("is-open");
      modal.setAttribute("aria-hidden", "false");
    }
  }

  function closePointModal() {
    const modal = $("pointModal");
    if (modal) {
      modal.classList.remove("is-open");
      modal.setAttribute("aria-hidden", "true");
    }
  }

  function showPointForm() {
    editingIndex = -1;
    $("modalTitle").textContent = "Ø¥Ø¶Ø§ÙØ© Ù†Ù‚Ø·Ø© Ø¬Ø¯ÙŠØ¯Ø©";
    $("modalSaveBtn").textContent = "Ø¥Ø¶Ø§ÙØ©";
    $("pt_name").value = "";
    $("pt_rl").value = "";
    $("pt_image").value = "";
    $("img_status").textContent = "Ù„Ø§ ØªÙˆØ¬Ø¯ ØµÙˆØ±Ø©";
    openPointModal();
  }

  function editPoint(index) {
    const point = points[index];
    if (!point) return;

    editingIndex = index;
    $("modalTitle").textContent = "ØªØ¹Ø¯ÙŠÙ„ Ø§Ù„Ù†Ù‚Ø·Ø©";
    $("modalSaveBtn").textContent = "Ø­ÙØ¸ Ø§Ù„ØªØ¹Ø¯ÙŠÙ„";
    $("pt_name").value = point.name || "";
    $("pt_rl").value = point.rl || "";
    $("pt_image").value = "";
    $("img_status").textContent = point.imageData ? "âœ… ÙŠÙˆØ¬Ø¯ ØµÙˆØ±Ø© (Ø§Ø®ØªØ± Ù„ØªØºÙŠÙŠØ±Ù‡Ø§)" : "Ù„Ø§ ØªÙˆØ¬Ø¯ ØµÙˆØ±Ø©";
    openPointModal();
  }

  function hidePointForm() {
    closePointModal();
  }

  function updateImageStatus() {
    const file = $("pt_image").files[0];
    $("img_status").textContent = file ? `âœ… ${file.name}` : "Ù„Ø§ ØªÙˆØ¬Ø¯ ØµÙˆØ±Ø©";
  }

  async function savePoint() {
    const name = safeValue("pt_name").trim();
    const rl = safeValue("pt_rl").trim();
    const imageFile = $("pt_image").files[0];

    if (!name || !rl) {
      showToast("âŒ ÙŠØ±Ø¬Ù‰ Ø¥Ø¯Ø®Ø§Ù„ Ø§Ø³Ù… Ø§Ù„Ù†Ù‚Ø·Ø© ÙˆØ§Ù„Ù…Ù†Ø³ÙˆØ¨");
      return;
    }

    let nextPoint = {
      name,
      rl,
      imageData: "",
      imageName: "",
    };

    if (editingIndex >= 0 && points[editingIndex]) {
      nextPoint = { ...points[editingIndex], name, rl };
    }

    if (imageFile) {
      try {
        nextPoint.imageData = await readFileAsDataUrl(imageFile);
        nextPoint.imageName = imageFile.name;
      } catch (_) {
        showToast("âŒ ØªØ¹Ø°Ø± Ù‚Ø±Ø§Ø¡Ø© ØµÙˆØ±Ø© Ø§Ù„Ù†Ù‚Ø·Ø©");
        return;
      }
    }

    if (editingIndex >= 0) {
      points[editingIndex] = nextPoint;
      showToast("âœ… ØªÙ… ØªØ¹Ø¯ÙŠÙ„ Ø§Ù„Ù†Ù‚Ø·Ø© Ø¨Ù†Ø¬Ø§Ø­");
    } else {
      points.push(nextPoint);
      showToast("âœ… ØªÙ…Øª Ø¥Ø¶Ø§ÙØ© Ø§Ù„Ù†Ù‚Ø·Ø©");
    }

    updatePointsTable();
    hidePointForm();
    saveAppState();
  }

  function updatePointsTable() {
    const tbody = $("pointsList");
    if (!tbody) return;

    if (!points.length) {
      tbody.innerHTML = '<tr><td colspan="4" class="empty-msg">Ù„Ø§ ØªÙˆØ¬Ø¯ Ù†Ù‚Ø§Ø· Ù…Ø¶Ø§ÙØ© Ø¨Ø¹Ø¯</td></tr>';
      populateStep2Selects();
      return;
    }

    tbody.innerHTML = points
      .map(
        (point, index) => `
          <tr>
            <td>${point.name}</td>
            <td>${Number(point.rl).toFixed(3)}</td>
            <td>${point.imageData ? "ðŸ“·" : "â€”"}</td>
            <td>
              <div class="point-actions">
                <button class="point-action-btn is-edit" type="button" title="ØªØ¹Ø¯ÙŠÙ„" onclick="editPoint(${index})">âœï¸</button>
                <button class="point-action-btn is-delete" type="button" title="Ø­Ø°Ù" onclick="deletePoint(${index})">ðŸ—‘ï¸</button>
              </div>
            </td>
          </tr>`,
      )
      .join("");

    populateStep2Selects();
  }

  function deletePoint(index) {
    points.splice(index, 1);
    updatePointsTable();

    if (points.length < 2 && currentStep > 1) {
      nextStep(1, true);
      showToast("âš ï¸ Ø±Ø¬Ø¹Ù†Ø§ Ø¥Ù„Ù‰ Ø§Ù„Ø®Ø·ÙˆØ© Ø§Ù„Ø£ÙˆÙ„Ù‰ Ù„Ø£Ù† Ø¹Ø¯Ø¯ Ø§Ù„Ù†Ù‚Ø§Ø· Ø£ØµØ¨Ø­ Ø£Ù‚Ù„ Ù…Ù† Ù†Ù‚Ø·ØªÙŠÙ†");
    } else {
      calculateCheck();
      if (currentStep === 4) {
        generateReport();
      }
    }

    saveAppState();
  }

  function populateStep2Selects() {
    const select1 = $("sel_pt1");
    const select2 = $("sel_pt2");
    if (!select1 || !select2) return;

    const previous1 = select1.value;
    const previous2 = select2.value;
    const placeholder = '<option value="">-- Ø§Ø®ØªØ± Ø§Ù„Ù†Ù‚Ø·Ø© --</option>';
    const options = points
      .map((point, index) => `<option value="${index}">${point.name} (RL: ${Number(point.rl).toFixed(3)})</option>`)
      .join("");

    select1.innerHTML = placeholder + options;
    select2.innerHTML = placeholder + options;

    if (previous1 !== "" && points[Number(previous1)]) {
      select1.value = previous1;
    }
    if (previous2 !== "" && points[Number(previous2)]) {
      select2.value = previous2;
    }

    enableNextField(1);
    enableNextField(2);
    enableNextField(3);
  }

  function enableNextField(step) {
    if (step === 1 && $("read_1")) {
      $("read_1").disabled = safeValue("sel_pt1") === "";
    }
    if (step === 2 && $("sel_pt2")) {
      $("sel_pt2").disabled = safeValue("read_1").trim() === "";
    }
    if (step === 3 && $("read_2")) {
      $("read_2").disabled = safeValue("sel_pt2") === "";
    }
  }

  function calculateCheck() {
    const p1Idx = safeValue("sel_pt1");
    const p2Idx = safeValue("sel_pt2");
    const read1 = parseFloat(safeValue("read_1"));
    const read2 = parseFloat(safeValue("read_2"));
    const calcBox = $("calcBox");
    const nextBtn = $("btnCheckNext");

    if (p1Idx === "" || Number.isNaN(read1) || p2Idx === "" || Number.isNaN(read2)) {
      if (calcBox) calcBox.style.display = "none";
      if (nextBtn) nextBtn.disabled = true;
      saveAppState();
      return;
    }

    if (p1Idx === p2Idx) {
      if (calcBox) calcBox.style.display = "none";
      if (nextBtn) nextBtn.disabled = true;
      showToast("âš ï¸ ÙŠØ¬Ø¨ Ø§Ø®ØªÙŠØ§Ø± Ù†Ù‚Ø·ØªÙŠÙ† Ù…Ø®ØªÙ„ÙØªÙŠÙ† Ù„Ù„ØªØ­Ù‚Ù‚");
      saveAppState();
      return;
    }

    const point1 = points[Number(p1Idx)];
    const point2 = points[Number(p2Idx)];
    if (!point1 || !point2) {
      return;
    }

    if (calcBox) calcBox.style.display = "block";

    const rl1 = parseFloat(point1.rl);
    const rl2 = parseFloat(point2.rl);
    const msmValue = rl1 + read1;
    const trueDiff = Math.abs(rl1 - rl2);
    const obsRL2 = msmValue - read2;
    const calcDiff = Math.abs(rl1 - obsRL2);
    const error = Math.abs(trueDiff - calcDiff);

    globalMSM = msmValue;
    $("res_msm").textContent = `${msmValue.toFixed(3)} m`;
    $("res_true_diff").textContent = `${trueDiff.toFixed(3)} m`;
    $("res_calc_diff").textContent = `${calcDiff.toFixed(3)} m`;

    const errorNode = $("res_error");
    const statusBadge = $("statusBadge");
    errorNode.textContent = `${error.toFixed(3)} m`;
    statusBadge.style.display = "block";

    if (error <= TOLERANCE_METERS) {
      statusBadge.style.background = "#dcfce7";
      statusBadge.style.color = "#166534";
      statusBadge.textContent = "âœ… Ù…Ø³Ù…ÙˆØ­ Ø¨Ù‡";
      errorNode.style.color = "#166534";
      nextBtn.disabled = false;
    } else {
      statusBadge.style.background = "#fee2e2";
      statusBadge.style.color = "#991b1b";
      statusBadge.textContent = "âŒ ØºÙŠØ± Ù…Ø³Ù…ÙˆØ­ Ø¨Ù‡";
      errorNode.style.color = "#dc2626";
      nextBtn.disabled = true;
    }

    if (currentStep >= 3) {
      updateStakingCalc();
    }
    saveAppState();
  }

  function syncOffsetUI() {
    const option0 = $("off_0");
    const option1 = $("off_1");
    const optionCustom = $("off_custom");
    const label = $("custom_off_label");

    [option0, option1, optionCustom].forEach((node) => node && node.classList.remove("active"));

    if (stakingOffset === 0 && option0) {
      option0.classList.add("active");
    } else if (stakingOffset === 1 && option1) {
      option1.classList.add("active");
    } else if (optionCustom) {
      optionCustom.classList.add("active");
    }

    if (label) {
      label.textContent =
        stakingOffset === 0 || stakingOffset === 1
          ? "Ù‚ÙŠÙ…Ø© Ø®Ø§ØµØ©"
          : `${formatSigned(stakingOffset, 2)}m`;
    }
  }

  function setStakingOffset(value) {
    stakingOffset = Number(value) || 0;
    syncOffsetUI();
    updateStakingCalc();
  }

  function showCustomOffsetModal() {
    const value = window.prompt("Ø£Ø¯Ø®Ù„ Ù‚ÙŠÙ…Ø© Ø§Ù„Ø¥Ø²Ø§Ø­Ø© Ø§Ù„Ø®Ø§ØµØ© (Ù…ØªØ±):", String(stakingOffset || 0));
    if (value === null) {
      return;
    }

    const parsed = Number(value);
    if (Number.isNaN(parsed)) {
      showToast("âŒ Ù‚ÙŠÙ…Ø© Ø§Ù„Ø¥Ø²Ø§Ø­Ø© ØºÙŠØ± ØµØ­ÙŠØ­Ø©");
      return;
    }

    stakingOffset = parsed;
    syncOffsetUI();
    updateStakingCalc();
  }

  function renderStakingImageState() {
    const card = $("photoCard");
    const icon = $("photoIcon");
    const text = $("staking_img_text");
    const hint = $("staking_img_hint");
    const preview = $("staking_preview");

    if (!card || !icon || !text || !hint || !preview) return;

    if (stakingImageData) {
      card.classList.add("has-image");
      icon.textContent = "âœ…";
      text.textContent = stakingImageName || "ØªÙ… Ø§Ù„ØªÙ‚Ø§Ø· ØµÙˆØ±Ø© Ø§Ù„Ø¹Ù„Ø§Ù… Ø¨Ù†Ø¬Ø§Ø­";
      hint.textContent = "Ø§Ø¶ØºØ· Ù„Ù„ØªØºÙŠÙŠØ±";
      preview.src = stakingImageData;
      preview.style.display = "block";
      return;
    }

    card.classList.remove("has-image");
    icon.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="24" height="24"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>';
    text.textContent = "Ø§Ù„ØªÙ‚Ø§Ø· ØµÙˆØ±Ø© Ù„Ù„Ø¹Ù„Ø§Ù… Ø§Ù„Ù…ÙŠØ¯Ø§Ù†ÙŠ";
    hint.textContent = "Ø§Ø¶ØºØ· Ù‡Ù†Ø§ Ù„ÙØªØ­ Ø§Ù„ÙƒØ§Ù…ÙŠØ±Ø§";
    preview.removeAttribute("src");
    preview.style.display = "none";
  }

  async function updateStakingImageStatus() {
    const file = $("staking_image").files[0];

    if (file) {
      try {
        stakingImageData = await readFileAsDataUrl(file);
        stakingImageName = file.name;
      } catch (_) {
        showToast("âŒ ØªØ¹Ø°Ø± Ù‚Ø±Ø§Ø¡Ø© ØµÙˆØ±Ø© Ø§Ù„Ø¹Ù„Ø§Ù…");
        return;
      }
    } else {
      stakingImageData = "";
      stakingImageName = "";
    }

    renderStakingImageState();
    saveAppState();
  }

  function updateStakingCalc() {
    const designInput = safeValue("design_rl").trim();
    const box = $("stakingResultBox");
    const secondaryBox = $("stakingSecondaryBox");

    if (!designInput) {
      box.style.display = "none";
      secondaryBox.style.display = "none";
      saveAppState();
      return;
    }

    const designRL = Number(designInput);
    const targetRL = designRL + stakingOffset;
    const reading = globalMSM - targetRL;

    box.style.display = "block";
    secondaryBox.style.display = "block";
    $("required_reading").textContent = reading.toFixed(3);
    $("target_rl_display").textContent = `${formatSigned(targetRL, 3)} (DMD)`;
    $("offset_display").textContent = `${formatSigned(stakingOffset, 2)}m`;

    const warning = $("reading_warning");
    if (reading < 0) {
      box.style.background = "#991b1b";
      warning.style.display = "inline-block";
    } else if (reading > 3) {
      box.style.background = "#b45309";
      warning.style.display = "none";
    } else {
      box.style.background = "#059669";
      warning.style.display = "none";
    }

    saveAppState();
  }

  function saveAppState() {
    const state = {
      points,
      currentStep,
      globalMSM,
      stakingOffset,
      stakingImageData,
      stakingImageName,
      inputs: {
        design_rl: safeValue("design_rl"),
        sel_pt1: safeValue("sel_pt1"),
        read_1: safeValue("read_1"),
        sel_pt2: safeValue("sel_pt2"),
        read_2: safeValue("read_2"),
      },
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function loadAppState() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      updatePointsTable();
      syncOffsetUI();
      renderStakingImageState();
      nextStep(1, true);
      return;
    }

    try {
      const state = JSON.parse(raw);
      points = Array.isArray(state.points) ? state.points : [];
      currentStep = Number(state.currentStep) || 1;
      globalMSM = Number(state.globalMSM) || 0;
      stakingOffset = Number(state.stakingOffset) || 0;
      stakingImageData = state.stakingImageData || "";
      stakingImageName = state.stakingImageName || "";

      updatePointsTable();
      syncOffsetUI();
      renderStakingImageState();

      if (state.inputs) {
        $("design_rl").value = state.inputs.design_rl || "";
        $("sel_pt1").value = state.inputs.sel_pt1 || "";
        $("read_1").value = state.inputs.read_1 || "";
        $("sel_pt2").value = state.inputs.sel_pt2 || "";
        $("read_2").value = state.inputs.read_2 || "";
      }

      enableNextField(1);
      enableNextField(2);
      enableNextField(3);
      calculateCheck();
      updateStakingCalc();
      nextStep(currentStep, true);
    } catch (_) {
      updatePointsTable();
      syncOffsetUI();
      renderStakingImageState();
      nextStep(1, true);
    }
  }

  function nextStep(step, skipValidation) {
    if (step < 1 || step > 4) return;

    if (!skipValidation && step > currentStep && step === 2 && points.length < 2) {
      showToast("âš ï¸ Ù…Ø·Ù„ÙˆØ¨ Ù†Ù‚Ø·ØªÙŠÙ† Ø¹Ù„Ù‰ Ø§Ù„Ø£Ù‚Ù„ Ù„Ø¥Ø«Ø¨Ø§Øª Ø§Ù„Ù…Ù†Ø³ÙˆØ¨");
      return;
    }

    if (!skipValidation && step > currentStep && step === 3) {
      calculateCheck();
      if ($("btnCheckNext").disabled) {
        showToast("âš ï¸ Ù„Ø§ ÙŠÙ…ÙƒÙ† Ø§Ù„Ø§Ù†ØªÙ‚Ø§Ù„ Ù‚Ø¨Ù„ ØªØ­Ù‚ÙŠÙ‚ Ø§Ù„Ø³Ù…Ø§Ø­ÙŠØ© Ø§Ù„Ù…Ø·Ù„ÙˆØ¨Ø©");
        return;
      }
    }

    if (!skipValidation && step > currentStep && step === 4) {
      if (safeValue("design_rl").trim() === "") {
        showToast("âš ï¸ Ø£Ø¯Ø®Ù„ Ù…Ù†Ø³ÙˆØ¨ Ø§Ù„Ø¬ÙŠØª Ù„ÙÙ„ Ø£ÙˆÙ„Ù‹Ø§");
        return;
      }
    }

    currentStep = step;
    document.querySelectorAll(".step-section").forEach((section) => section.classList.remove("active"));
    const target = $(`step${step}`);
    if (target) {
      target.classList.add("active");
    }

    if (step === 3) {
      syncOffsetUI();
      updateStakingCalc();
    }

    if (step === 4) {
      generateReport();
    }

    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    saveAppState();
  }

  function generateReport() {
    const reportPoints = $("rep_points_list");
    if (!reportPoints) return;

    reportPoints.innerHTML = points.length
      ? points
          .map(
            (point) => `
              <tr>
                <td>${point.name}</td>
                <td style="direction:ltr">${Number(point.rl).toFixed(3)}</td>
                <td>${point.imageData ? "ðŸ“·" : "-"}</td>
              </tr>`,
          )
          .join("")
      : '<tr><td colspan="3" style="padding:8px; color:#64748b;">Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¨ÙŠØ§Ù†Ø§Øª</td></tr>';

    const p1Idx = safeValue("sel_pt1");
    const p2Idx = safeValue("sel_pt2");
    const read1 = parseFloat(safeValue("read_1"));
    const read2 = parseFloat(safeValue("read_2"));
    const designRL = Number(safeValue("design_rl") || 0);
    const targetRL = designRL + stakingOffset;
    const reading = globalMSM - targetRL;

    if (p1Idx !== "" && p2Idx !== "" && points[Number(p1Idx)] && points[Number(p2Idx)] && !Number.isNaN(read1) && !Number.isNaN(read2)) {
      const rl1 = Number(points[Number(p1Idx)].rl);
      const rl2 = Number(points[Number(p2Idx)].rl);
      const msm = rl1 + read1;
      const trueDiff = Math.abs(rl1 - rl2);
      const obsRL2 = msm - read2;
      const calcDiff = Math.abs(rl1 - obsRL2);
      const error = Math.abs(trueDiff - calcDiff);

      $("rep_msm").textContent = `${msm.toFixed(3)} m`;
      $("rep_true_diff").textContent = `${trueDiff.toFixed(3)} m`;
      $("rep_calc_diff").textContent = `${calcDiff.toFixed(3)} m`;
      $("rep_error").textContent = `${error.toFixed(3)} m`;
      $("rep_error").style.color = error <= TOLERANCE_METERS ? "#059669" : "#dc2626";
    }

    $("rep_reading").textContent = reading.toFixed(3);
    $("rep_dmd").textContent = `DESIGN LEVEL: ${designRL.toFixed(3)} (DMD)`;
    $("rep_offset").textContent = `${formatSigned(stakingOffset, 2)}m Offset`;
    $("rep_gwd").textContent = `${formatSigned(targetRL, 3)} (DMD)`;

    const reportImg = $("rep_staking_img");
    const noImg = $("rep_no_img");
    if (stakingImageData) {
      reportImg.src = stakingImageData;
      reportImg.style.display = "block";
      noImg.style.display = "none";
    } else {
      reportImg.removeAttribute("src");
      reportImg.style.display = "none";
      noImg.style.display = "block";
    }

    const now = new Date();
    $("rep_date").textContent =
      now.toLocaleDateString("en-GB") +
      " " +
      now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    $("rep_id").textContent = String(Math.floor(now.getTime() / 1000)).slice(-6);
  }

  function cloneReportForExport() {
    const clone = $("reportContent").cloneNode(true);
    clone.querySelectorAll("img").forEach((img) => {
      const raw = img.getAttribute("src");
      if (!raw || raw.startsWith("data:")) {
        return;
      }
      try {
        img.setAttribute("src", new URL(raw, window.location.href).href);
      } catch (_) {
        // Leave the original path if resolution fails.
      }
    });
    return clone;
  }

  function exportToWord() {
    generateReport();

    const clone = cloneReportForExport();
    const fullHTML =
      "<!DOCTYPE html><html lang=\"ar\" dir=\"rtl\"><head><meta charset=\"UTF-8\"><title>Atlas Report</title>" +
      "<style>body{font-family:'Cairo',Arial,sans-serif;direction:rtl;text-align:right;background:#ffffff;padding:24px;}img{max-width:100%;}table{width:100%;border-collapse:collapse;}th,td{border:1px solid #e2e8f0;}<\/style>" +
      "</head><body>" +
      clone.outerHTML +
      "</body></html>";

    const blob = new Blob(["\ufeff", fullHTML], {
      type: "application/msword",
    });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Atlas_Gate_Level_${Date.now()}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(link.href), 1200);

    showToast("âœ… ØªÙ… ØªØ¬Ù‡ÙŠØ² Ù…Ù„Ù Word Ø¨Ù†Ø¬Ø§Ø­");
  }

  function exportToPDF() {
    generateReport();

    const clone = cloneReportForExport();
    const printWindow = window.open("", "_blank", "noopener,noreferrer,width=1100,height=900");

    if (!printWindow) {
      showToast("âŒ Ø§Ù„Ù…ØªØµÙØ­ Ù…Ù†Ø¹ Ù†Ø§ÙØ°Ø© Ø§Ù„Ø·Ø¨Ø§Ø¹Ø©. Ø§Ø³Ù…Ø­ Ø¨Ø§Ù„Ù†ÙˆØ§ÙØ° Ø§Ù„Ù…Ù†Ø¨Ø«Ù‚Ø© Ø«Ù… Ø­Ø§ÙˆÙ„ Ù…Ø¬Ø¯Ø¯Ù‹Ø§");
      return;
    }

    printWindow.document.open();
    printWindow.document.write(
      "<!DOCTYPE html><html lang=\"ar\" dir=\"rtl\"><head><meta charset=\"UTF-8\"><title>Atlas PDF Preview</title>" +
        "<style>body{margin:0;padding:24px;background:#f8fafc;font-family:'Cairo',Arial,sans-serif;direction:rtl;}img{max-width:100%;}table{width:100%;border-collapse:collapse;}@media print{body{background:#ffffff;padding:0;}}<\/style>" +
        "</head><body>" +
        clone.outerHTML +
        "</body></html>",
    );
    printWindow.document.close();

    printWindow.onload = function () {
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
      }, 350);
    };

    showToast("âœ… ØªÙ… ÙØªØ­ Ù†Ø§ÙØ°Ø© Ø§Ù„Ø·Ø¨Ø§Ø¹Ø©. Ø§Ø®ØªØ± Save as PDF Ù„Ø¥Ø®Ø±Ø§Ø¬ Ø§Ù„Ù…Ù„Ù");
  }

  function bindModalClose() {
    const modal = $("pointModal");
    if (!modal) return;

    modal.addEventListener("click", (event) => {
      if (event.target === modal) {
        hidePointForm();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && modal.classList.contains("is-open")) {
        hidePointForm();
      }
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    bindModalClose();
    loadAppState();
  });

  window.handleHeaderBack = handleHeaderBack;
  window.resetPage = resetPage;
  window.nextStep = nextStep;
  window.showPointForm = showPointForm;
  window.editPoint = editPoint;
  window.hidePointForm = hidePointForm;
  window.updateImageStatus = updateImageStatus;
  window.savePoint = savePoint;
  window.deletePoint = deletePoint;
  window.enableNextField = enableNextField;
  window.calculateCheck = calculateCheck;
  window.setStakingOffset = setStakingOffset;
  window.showCustomOffsetModal = showCustomOffsetModal;
  window.updateStakingCalc = updateStakingCalc;
  window.updateStakingImageStatus = updateStakingImageStatus;
  window.exportToWord = exportToWord;
  window.exportToPDF = exportToPDF;
  window.goToNewWorkHome = navigateToOverview;
  window.goToDashboardHome = navigateToHome;
})();
