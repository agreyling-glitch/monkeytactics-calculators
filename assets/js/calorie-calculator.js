(function () {
  'use strict';

  const form = document.getElementById('calorieForm');
  if (!form) return;

  const KG_PER_LB = 0.45359237;
  const CM_PER_INCH = 2.54;
  const VALID_UNITS = ['metric', 'imperial'];
  const VALID_SEXES = ['male', 'female'];
  const VALID_ACTIVITIES = ['sedentary', 'light', 'moderate', 'heavy', 'athlete'];
  const LIMITS = {
    age: { min: 18, max: 120 },
    heightCm: { min: 100, max: 250 },
    weightKg: { min: 30, max: 300 }
  };

  const fields = {
    age: document.getElementById('age'),
    sex: document.getElementById('sex'),
    heightCm: document.getElementById('heightCm'),
    weightKg: document.getElementById('weightKg'),
    heightFt: document.getElementById('heightFt'),
    heightIn: document.getElementById('heightIn'),
    weightLb: document.getElementById('weightLb'),
    activity: document.getElementById('activityLevel'),
    unitSystems: Array.from(form.elements.unitSystem)
  };

  const errors = {
    age: document.getElementById('ageError'),
    sex: document.getElementById('sexError'),
    heightMetric: document.getElementById('heightMetricError'),
    weightMetric: document.getElementById('weightMetricError'),
    heightImperial: document.getElementById('heightImperialError'),
    weightImperial: document.getElementById('weightImperialError')
  };

  const output = {
    panel: document.getElementById('resultsPanel'),
    announcement: document.getElementById('resultsAnnouncement'),
    bmr: document.getElementById('bmrResult'),
    tdee: document.getElementById('tdeeResult'),
    loss: document.getElementById('lossResult'),
    maintenance: document.getElementById('maintenanceResult'),
    gain: document.getElementById('gainResult'),
    bmrFormula: document.getElementById('bmrFormula'),
    activity: document.getElementById('activityBreakdown'),
    tdeeFormula: document.getElementById('tdeeFormula')
  };

  const unitPanels = Array.from(document.querySelectorAll('[data-unit-panel]'));
  const activityMeter = document.getElementById('activityMeterFill');
  const copyLinkButton = document.getElementById('copyLinkBtn');
  const copyConfirmation = document.getElementById('copyConfirm');
  let convertedMeasurements = null;
  let copyConfirmationTimer;

  function getUnitSystem() {
    return fields.unitSystems.find((radio) => radio.checked)?.value || 'metric';
  }

  function parseNumber(field) {
    const value = Number(field.value);
    return field.value.trim() === '' || !Number.isFinite(value) ? null : value;
  }

  function formatUrlNumber(value, decimals = 2) {
    return Number(value.toFixed(decimals)).toString();
  }

  function setError(key, fieldList, message) {
    errors[key].textContent = message;
    fieldList.forEach((field) => {
      field.setAttribute('aria-invalid', message ? 'true' : 'false');
    });
  }

  function validateAge() {
    const age = parseNumber(fields.age);
    let message = '';

    if (age === null) message = 'Enter your age.';
    else if (!Number.isInteger(age)) message = 'Enter age as a whole number.';
    else if (age < LIMITS.age.min || age > LIMITS.age.max) {
      message = 'This calculator is designed for adults ages 18–120.';
    }

    setError('age', [fields.age], message);
    return !message;
  }

  function validateSex() {
    const valid = VALID_SEXES.includes(fields.sex.value);
    setError('sex', [fields.sex], valid ? '' : 'Select the sex used by the formula.');
    return valid;
  }

  function validateMetric() {
    const height = parseNumber(fields.heightCm);
    const weight = parseNumber(fields.weightKg);
    const heightMessage = height === null
      ? 'Enter your height in centimeters.'
      : height < LIMITS.heightCm.min || height > LIMITS.heightCm.max
        ? 'Enter an adult height between 100 and 250 cm.'
        : '';
    const weightMessage = weight === null
      ? 'Enter your weight in kilograms.'
      : weight < LIMITS.weightKg.min || weight > LIMITS.weightKg.max
        ? 'Enter a weight between 30 and 300 kg.'
        : '';

    setError('heightMetric', [fields.heightCm], heightMessage);
    setError('weightMetric', [fields.weightKg], weightMessage);
    return !heightMessage && !weightMessage;
  }

  function validateImperial() {
    const feet = parseNumber(fields.heightFt);
    const inches = parseNumber(fields.heightIn);
    const pounds = parseNumber(fields.weightLb);
    const heightCm = feet === null || inches === null
      ? null
      : ((feet * 12) + inches) * CM_PER_INCH;
    let heightMessage = '';

    if (feet === null || inches === null) {
      heightMessage = 'Enter your height in feet and inches.';
    } else if (!Number.isInteger(feet) || inches < 0 || inches >= 12) {
      heightMessage = 'Use whole feet and between 0 and 11.99 inches.';
    } else if (heightCm < LIMITS.heightCm.min || heightCm > LIMITS.heightCm.max) {
      heightMessage = 'Enter an adult height from 3 ft 3 in to 8 ft 2 in.';
    }

    const weightKg = pounds === null ? null : pounds * KG_PER_LB;
    const weightMessage = pounds === null
      ? 'Enter your weight in pounds.'
      : weightKg < LIMITS.weightKg.min || weightKg > LIMITS.weightKg.max
        ? 'Enter a weight between 66 and 661 lb.'
        : '';

    setError('heightImperial', [fields.heightFt, fields.heightIn], heightMessage);
    setError('weightImperial', [fields.weightLb], weightMessage);
    return !heightMessage && !weightMessage;
  }

  function validateForm() {
    const generalValid = [validateAge(), validateSex()].every(Boolean);
    const measurementsValid = getUnitSystem() === 'metric'
      ? validateMetric()
      : validateImperial();
    return generalValid && measurementsValid;
  }

  // Normalize either visible unit system to centimeters and kilograms.
  function getMetricMeasurements() {
    if (convertedMeasurements) return { ...convertedMeasurements };

    if (getUnitSystem() === 'metric') {
      return {
        heightCm: Number(fields.heightCm.value),
        weightKg: Number(fields.weightKg.value)
      };
    }

    const totalInches = (Number(fields.heightFt.value) * 12) + Number(fields.heightIn.value);
    return {
      heightCm: totalInches * CM_PER_INCH,
      weightKg: Number(fields.weightLb.value) * KG_PER_LB
    };
  }

  // Mifflin–St Jeor: base metabolic demand plus the sex-specific constant.
  function calculateBmr({ age, sex, heightCm, weightKg }) {
    const sexAdjustment = sex === 'male' ? 5 : -161;
    return (10 * weightKg) + (6.25 * heightCm) - (5 * age) + sexAdjustment;
  }

  // Total daily energy expenditure scales BMR by the selected activity factor.
  function calculateTdee(bmr, activityFactor) {
    return bmr * activityFactor;
  }

  function formatCalories(value) {
    return Math.round(value).toLocaleString();
  }

  function calculate() {
    if (!validateForm()) {
      output.panel.hidden = true;
      return false;
    }

    const age = Number(fields.age.value);
    const sex = fields.sex.value;
    const measurements = getMetricMeasurements();
    const selectedActivity = fields.activity.options[fields.activity.selectedIndex];
    const activityFactor = Number(selectedActivity.dataset.factor);
    const bmr = calculateBmr({ age, sex, ...measurements });
    const tdee = calculateTdee(bmr, activityFactor);
    const sexAdjustment = sex === 'male' ? 5 : -161;
    const activityName = selectedActivity.text.split(' — ')[0];

    output.bmr.textContent = formatCalories(bmr);
    output.tdee.textContent = formatCalories(tdee);
    output.loss.textContent = formatCalories(tdee - 500);
    output.maintenance.textContent = formatCalories(tdee);
    output.gain.textContent = formatCalories(tdee + 300);
    output.bmrFormula.textContent =
      `10 × ${measurements.weightKg.toFixed(1)} kg + 6.25 × ${measurements.heightCm.toFixed(1)} cm − 5 × ${age} ${sexAdjustment >= 0 ? '+' : '−'} ${Math.abs(sexAdjustment)} = ${formatCalories(bmr)} kcal`;
    output.activity.textContent = `${activityName} × ${activityFactor}`;
    output.tdeeFormula.textContent =
      `${formatCalories(bmr)} × ${activityFactor} = ${formatCalories(tdee)} kcal`;
    output.announcement.textContent =
      `Results updated. BMR ${formatCalories(bmr)} calories per day. Estimated daily calorie needs ${formatCalories(tdee)} calories.`;
    output.panel.hidden = false;
    return true;
  }

  function convertVisibleValues(nextSystem) {
    if (nextSystem === 'imperial') {
      const heightCm = convertedMeasurements?.heightCm ?? parseNumber(fields.heightCm);
      const weightKg = convertedMeasurements?.weightKg ?? parseNumber(fields.weightKg);

      if (heightCm !== null) {
        const totalInches = heightCm / CM_PER_INCH;
        fields.heightFt.value = Math.floor(totalInches / 12);
        fields.heightIn.value = formatUrlNumber(totalInches % 12);
      }
      if (weightKg !== null) fields.weightLb.value = formatUrlNumber(weightKg / KG_PER_LB);

      convertedMeasurements = heightCm === null || weightKg === null
        ? null
        : { heightCm, weightKg };
      return;
    }

    const feet = parseNumber(fields.heightFt);
    const inches = parseNumber(fields.heightIn);
    const pounds = parseNumber(fields.weightLb);
    const heightCm = convertedMeasurements?.heightCm
      ?? (feet === null || inches === null ? null : ((feet * 12) + inches) * CM_PER_INCH);
    const weightKg = convertedMeasurements?.weightKg
      ?? (pounds === null ? null : pounds * KG_PER_LB);

    if (heightCm !== null) fields.heightCm.value = heightCm.toFixed(1);
    if (weightKg !== null) fields.weightKg.value = weightKg.toFixed(1);
    convertedMeasurements = heightCm === null || weightKg === null
      ? null
      : { heightCm, weightKg };
  }

  function showUnitSystem(nextSystem, shouldConvert = true) {
    if (shouldConvert) convertVisibleValues(nextSystem);

    fields.unitSystems.forEach((radio) => {
      radio.checked = radio.value === nextSystem;
    });

    unitPanels.forEach((panel) => {
      const isActive = panel.dataset.unitPanel === nextSystem;
      panel.hidden = !isActive;
      panel.querySelectorAll('input').forEach((input) => {
        input.disabled = !isActive;
        input.required = isActive;
        if (!isActive) input.setAttribute('aria-invalid', 'false');
      });
    });

    Object.values(errors).forEach((error) => {
      if (error.closest('[hidden]')) error.textContent = '';
    });
  }

  function updateActivityMeter() {
    const option = fields.activity.options[fields.activity.selectedIndex];
    activityMeter.style.width = `${Number(option.dataset.level) * 20}%`;
  }

  /* URL state: readable values make shared links easy to inspect and edit.
     Imperial height is encoded as feet-inches, for example height=5-7. */
  function writeUrlParams() {
    const params = new URLSearchParams();
    const unitSystem = getUnitSystem();
    const age = parseNumber(fields.age);
    const weight = unitSystem === 'metric'
      ? parseNumber(fields.weightKg)
      : parseNumber(fields.weightLb);

    params.set('unit', unitSystem);
    if (age !== null) params.set('age', formatUrlNumber(age));
    if (VALID_SEXES.includes(fields.sex.value)) params.set('sex', fields.sex.value);

    if (unitSystem === 'metric') {
      const height = parseNumber(fields.heightCm);
      if (height !== null) params.set('height', formatUrlNumber(height, 1));
    } else {
      const feet = parseNumber(fields.heightFt);
      const inches = parseNumber(fields.heightIn);
      if (feet !== null && inches !== null) {
        params.set('height', `${formatUrlNumber(feet)}-${formatUrlNumber(inches)}`);
      }
    }

    if (weight !== null) params.set('weight', formatUrlNumber(weight));
    params.set('activity', fields.activity.value);

    const query = params.toString();
    const newUrl = `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`;
    window.history.replaceState(null, '', newUrl);
  }

  function parseImperialHeight(value) {
    if (!value) return null;
    const match = value.trim().match(/^(\d+)\s*(?:-|:|\/|ft|'|\s)\s*(\d+(?:\.\d+)?)\s*(?:in|")?$/i);
    if (!match) return null;
    return { feet: Number(match[1]), inches: Number(match[2]) };
  }

  // Apply supported query parameters without allowing unknown option values.
  function readUrlParams() {
    const params = new URLSearchParams(window.location.search);
    if (![...params.keys()].length) return false;

    const unit = VALID_UNITS.includes(params.get('unit')) ? params.get('unit') : 'metric';
    const age = Number(params.get('age'));
    const sex = params.get('sex');
    const activity = params.get('activity');
    const height = params.get('height');
    const weight = Number(params.get('weight'));

    showUnitSystem(unit, false);
    convertedMeasurements = null;

    if (params.has('age') && Number.isFinite(age)) fields.age.value = age;
    if (VALID_SEXES.includes(sex)) fields.sex.value = sex;
    if (VALID_ACTIVITIES.includes(activity)) fields.activity.value = activity;

    if (unit === 'metric') {
      const heightCm = Number(height);
      if (height !== null && Number.isFinite(heightCm)) fields.heightCm.value = heightCm;
      if (params.has('weight') && Number.isFinite(weight)) fields.weightKg.value = weight;
    } else {
      const imperialHeight = parseImperialHeight(height);
      if (imperialHeight) {
        fields.heightFt.value = imperialHeight.feet;
        fields.heightIn.value = imperialHeight.inches;
      }
      if (params.has('weight') && Number.isFinite(weight)) fields.weightLb.value = weight;
    }

    return true;
  }

  function updateCalculator() {
    updateActivityMeter();
    calculate();
    writeUrlParams();
  }

  function showCopyMessage(message, duration = 2500) {
    window.clearTimeout(copyConfirmationTimer);
    copyConfirmation.textContent = message;
    copyConfirmationTimer = window.setTimeout(() => {
      copyConfirmation.textContent = '';
    }, duration);
  }

  async function copyBookmarkableLink() {
    writeUrlParams();
    try {
      await navigator.clipboard.writeText(window.location.href);
      showCopyMessage('✅ Link copied!');
    } catch (error) {
      showCopyMessage('Copy failed—copy the URL from your address bar.', 4000);
    }
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    updateCalculator();
  });

  form.addEventListener('reset', () => {
    convertedMeasurements = null;
    window.setTimeout(() => {
      showUnitSystem('metric', false);
      updateActivityMeter();
      Object.values(errors).forEach((error) => { error.textContent = ''; });
      form.querySelectorAll('[aria-invalid]').forEach((field) => {
        field.setAttribute('aria-invalid', 'false');
      });
      output.panel.hidden = true;
      output.announcement.textContent = 'Calculator reset.';
      writeUrlParams();
      fields.age.focus();
    });
  });

  fields.unitSystems.forEach((radio) => {
    radio.addEventListener('change', () => {
      showUnitSystem(radio.value);
      updateCalculator();
    });
  });

  [fields.heightCm, fields.weightKg, fields.heightFt, fields.heightIn, fields.weightLb]
    .forEach((field) => {
      field.addEventListener('input', () => {
        convertedMeasurements = null;
        updateCalculator();
      });
    });

  fields.age.addEventListener('input', updateCalculator);
  fields.sex.addEventListener('change', updateCalculator);
  fields.activity.addEventListener('change', updateCalculator);
  copyLinkButton.addEventListener('click', copyBookmarkableLink);

  showUnitSystem('metric', false);
  updateActivityMeter();
  const hasUrlState = readUrlParams();
  updateActivityMeter();

  if (hasUrlState) {
    calculate();
    writeUrlParams();
  }
})();
