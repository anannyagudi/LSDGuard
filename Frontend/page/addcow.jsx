import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  FileText,
  ImagePlus,
  Milk,
  Plus,
  ShieldCheck,
  Stethoscope,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import "./addcow.css";

const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE) ||
  "http://localhost:5000";

const photoTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const reportTypes = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];

const initialForm = {
  cowName: "",
  dateOfBirth: "",
  milkProduction: "",
  vaccinationsDone: "",
  vaccinationsPending: "0",
  lastVaccinationDate: "",
  lastVaccinationDoctor: "",
};

export default function AddCow() {
  const navigate = useNavigate();
  const [gender, setGender] = useState("Female");
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [report, setReport] = useState(null);
  const [reportPreviewUrl, setReportPreviewUrl] = useState(null);
  const [vaccinationSlots, setVaccinationSlots] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
      if (reportPreviewUrl) URL.revokeObjectURL(reportPreviewUrl);
    };
  }, [photoPreview, reportPreviewUrl]);

  const nextVaccination = useMemo(
    () => getNextVaccinationInfo(form.lastVaccinationDate),
    [form.lastVaccinationDate],
  );

  const pendingCount = Number(form.vaccinationsPending || 0);
  const hasPhoto = Boolean(photo);
  const hasName = Boolean(form.cowName.trim());
  const hasBirthDate = Boolean(form.dateOfBirth);
  const hasProductionDetails = gender === "Male" || Boolean(form.milkProduction);
  const hasBasicDetails = hasName && hasBirthDate;
  const hasPendingSchedule =
    pendingCount > 0 &&
    vaccinationSlots.length === pendingCount &&
    vaccinationSlots.every((slot) => slot.date && slot.time && slot.doctor.trim());
  const hasLastVaccination = Boolean(form.lastVaccinationDate && form.lastVaccinationDoctor.trim());
  const hasVaccinationRecord = Boolean(form.vaccinationsDone) || hasLastVaccination || hasPendingSchedule;
  const hasReport = Boolean(report);
  const completion = [
    hasPhoto,
    hasBasicDetails,
    hasProductionDetails,
    hasVaccinationRecord,
    hasReport,
  ].filter(Boolean).length;

  const showNotice = (type, text) => {
    setNotice({ type, text });
    window.setTimeout(() => setNotice(null), 2600);
  };

  const updateForm = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handlePendingChange = (event) => {
    const raw = event.target.value;
    const count = Math.max(0, Number(raw || 0));
    updateForm("vaccinationsPending", raw);
    setVaccinationSlots((current) => {
      if (count === 0) return [];
      if (count > current.length) {
        const nextSlots = Array.from({ length: count - current.length }, () => ({
          date: "",
          time: "",
          doctor: "",
        }));
        return [...current, ...nextSlots];
      }
      return current.slice(0, count);
    });
  };

  const updateSlot = (index, field, value) => {
    setVaccinationSlots((current) =>
      current.map((slot, slotIndex) =>
        slotIndex === index ? { ...slot, [field]: value } : slot,
      ),
    );
  };

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!photoTypes.includes(file.type)) {
      event.target.value = "";
      showNotice("error", "Upload cow photo as PNG, JPG, JPEG, or WEBP.");
      return;
    }

    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleReportChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!reportTypes.includes(file.type)) {
      event.target.value = "";
      showNotice("error", "Upload report as PDF, PNG, JPG, or JPEG.");
      return;
    }

    if (reportPreviewUrl) URL.revokeObjectURL(reportPreviewUrl);
    setReport(file);
    setReportPreviewUrl(URL.createObjectURL(file));
    event.target.value = "";
  };

  const removeReport = () => {
    if (reportPreviewUrl) URL.revokeObjectURL(reportPreviewUrl);
    setReport(null);
    setReportPreviewUrl(null);
  };

  const validate = () => {
    const user = JSON.parse(localStorage.getItem("user") || "null");

    if (!user?._id) return "Please sign in again before adding cow details.";
    if (!photo) return "Cow photo is required.";
    if (!form.cowName.trim()) return "Please enter the cow name.";
    if (!form.dateOfBirth) return "Please select the date of birth.";
    if (gender === "Female" && !form.milkProduction) return "Please enter milk production for female cow.";

    const lastDateSet = Boolean(form.lastVaccinationDate);
    const lastDoctorSet = Boolean(form.lastVaccinationDoctor.trim());
    if (lastDateSet !== lastDoctorSet) return "Complete both last vaccination date and doctor.";

    if (pendingCount > 0) {
      const missingSlot = vaccinationSlots.find(
        (slot) => !slot.date || !slot.time || !slot.doctor.trim(),
      );
      if (missingSlot) return "Complete all pending vaccination slots.";
    }

    return "";
  };

  const handleSubmit = async () => {
    if (loading) return;

    const validationMessage = validate();
    if (validationMessage) {
      showNotice("error", validationMessage);
      return;
    }

    const user = JSON.parse(localStorage.getItem("user") || "null");
    const formData = new FormData();
    formData.append("userId", user._id);
    formData.append("cowName", form.cowName.trim());
    formData.append("gender", gender);
    formData.append("milkProduction", gender === "Female" ? Number(form.milkProduction) : 0);
    formData.append("dateOfBirth", form.dateOfBirth);
    formData.append("vaccinationsDone", form.vaccinationsDone || "0");
    formData.append("vaccinationsPending", form.vaccinationsPending || "0");

    if (pendingCount > 0 && vaccinationSlots.length > 0) {
      const first = vaccinationSlots[0];
      formData.append("pendingVaccinationDate", `${first.date}T${first.time}`);
      formData.append("pendingVaccinationDoctor", first.doctor.trim());
    } else {
      formData.append("pendingVaccinationDate", "");
      formData.append("pendingVaccinationDoctor", "");
    }

    formData.append("lastVaccinationDate", form.lastVaccinationDate);
    formData.append("lastVaccinationDoctor", form.lastVaccinationDoctor.trim());
    formData.append("vaccinationSlots", JSON.stringify(vaccinationSlots));
    formData.append("photo", photo);
    if (report) formData.append("healthReport", report);

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/cow/add`, {
        method: "POST",
        body: formData,
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Could not add cow. Please try again.");
      }

      showNotice("success", "Cow profile added successfully.");
      window.setTimeout(() => navigate("/home"), 900);
    } catch (error) {
      showNotice("error", error.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="addcow-page">
      {notice && <div className={`addcow-toast ${notice.type}`}>{notice.text}</div>}

      <header className="addcow-header">
        <button className="addcow-back" type="button" onClick={() => navigate("/home")}>
          <ArrowLeft size={18} />
          Back
        </button>

        <div className="addcow-hero-copy">
          <span className="addcow-kicker">
            <ShieldCheck size={15} />
            Herd Registration
          </span>
          <h1>Add Cow Profile</h1>
          <p>Create a complete cattle record with photo, milk details, vaccination schedule, and reports.</p>
        </div>

        <div className="addcow-progress-card">
          <strong>{completion}/5</strong>
          <span>Profile readiness</span>
          <div className="addcow-progress-track">
            <i style={{ width: `${(completion / 5) * 100}%` }} />
          </div>
        </div>
      </header>

      <section className="addcow-shell">
        <div className="addcow-main">
          <section className="addcow-card addcow-photo-card">
            <SectionTitle icon={ImagePlus} step="01" title="Cow Photo" text="Use a clear side image for easier identification later." />
            <div className="addcow-photo-grid">
              <div className="addcow-photo-preview">
                {photoPreview ? (
                  <img src={photoPreview} alt="Cow preview" />
                ) : (
                  <div>
                    <ImagePlus size={34} />
                    <span>No photo selected</span>
                  </div>
                )}
              </div>
              <label className="addcow-upload-tile">
                <UploadCloud size={26} />
                <strong>Upload cow photo</strong>
                <span>PNG, JPG, JPEG, or WEBP</span>
                <input type="file" accept="image/*" hidden onChange={handlePhotoChange} />
              </label>
            </div>
          </section>

          <section className="addcow-card">
            <SectionTitle icon={Stethoscope} step="02" title="Basic Details" text="These details identify the cow across scans and reports." />
            <div className="addcow-form-grid">
              <label className="addcow-field wide">
                <span>Cow Name</span>
                <input
                  value={form.cowName}
                  onChange={(event) => updateForm("cowName", event.target.value)}
                  placeholder="Example: Gauri"
                />
              </label>

              <div className="addcow-field">
                <span>Gender</span>
                <div className="addcow-segment">
                  {["Female", "Male"].map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={gender === option ? "active" : ""}
                      onClick={() => setGender(option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              <label className="addcow-field">
                <span>Date of Birth</span>
                <input
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(event) => updateForm("dateOfBirth", event.target.value)}
                />
              </label>

              {gender === "Female" && (
                <label className="addcow-field">
                  <span>Milk Production</span>
                  <input
                    type="number"
                    min="0"
                    value={form.milkProduction}
                    onChange={(event) => updateForm("milkProduction", event.target.value)}
                    placeholder="Litres per day"
                  />
                </label>
              )}
            </div>
          </section>

          <section className="addcow-card">
            <SectionTitle icon={CalendarClock} step="03" title="Vaccination Record" text="Track completed and upcoming vaccination work." />
            <div className="addcow-form-grid">
              <label className="addcow-field">
                <span>Vaccinations Done</span>
                <input
                  type="number"
                  min="0"
                  value={form.vaccinationsDone}
                  onChange={(event) => updateForm("vaccinationsDone", event.target.value)}
                  placeholder="0"
                />
              </label>
              <label className="addcow-field">
                <span>Pending Vaccinations</span>
                <input
                  type="number"
                  min="0"
                  value={form.vaccinationsPending}
                  onChange={handlePendingChange}
                  placeholder="0"
                />
              </label>
              <label className="addcow-field">
                <span>Last Vaccination Date</span>
                <input
                  type="date"
                  value={form.lastVaccinationDate}
                  onChange={(event) => updateForm("lastVaccinationDate", event.target.value)}
                />
              </label>
              <label className="addcow-field">
                <span>Last Vaccination Doctor</span>
                <input
                  value={form.lastVaccinationDoctor}
                  onChange={(event) => updateForm("lastVaccinationDoctor", event.target.value)}
                  placeholder="Doctor name"
                />
              </label>
            </div>

            <div className="addcow-next-card">
              <div>
                <span>Next yearly dose</span>
                <strong>{nextVaccination.dueDateString}</strong>
              </div>
              <p>{nextVaccination.status}</p>
            </div>

            {vaccinationSlots.length > 0 && (
              <div className="addcow-slot-list">
                {vaccinationSlots.map((slot, index) => (
                  <div className="addcow-slot-card" key={`slot-${index}`}>
                    <strong>Pending Dose {index + 1}</strong>
                    <div className="addcow-slot-grid">
                      <label>
                        <span>Date</span>
                        <input type="date" value={slot.date} onChange={(event) => updateSlot(index, "date", event.target.value)} />
                      </label>
                      <label>
                        <span>Time</span>
                        <input type="time" value={slot.time} onChange={(event) => updateSlot(index, "time", event.target.value)} />
                      </label>
                      <label>
                        <span>Doctor</span>
                        <input value={slot.doctor} onChange={(event) => updateSlot(index, "doctor", event.target.value)} placeholder="Doctor name" />
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="addcow-card">
            <SectionTitle icon={FileText} step="04" title="Previous Health Report" text="Attach a readable PDF or image if you have one." />
            {!report ? (
              <label className="addcow-report-drop">
                <Plus size={24} />
                <strong>Upload past report</strong>
                <span>PDF, PNG, JPG, or JPEG</span>
                <input type="file" accept=".pdf,image/*" hidden onChange={handleReportChange} />
              </label>
            ) : (
              <div className="addcow-report-file">
                <button type="button" onClick={() => window.open(reportPreviewUrl, "_blank", "noopener,noreferrer")}>
                  <span>{report.type === "application/pdf" ? "PDF" : "IMG"}</span>
                  <div>
                    <strong>{report.name}</strong>
                    <small>Click to preview</small>
                  </div>
                </button>
                <button className="addcow-remove-report" type="button" onClick={removeReport}>
                  <Trash2 size={16} />
                  Remove
                </button>
              </div>
            )}
          </section>
        </div>

        <aside className="addcow-summary">
          <div className="addcow-summary-card">
            <span className="addcow-summary-icon">
              <Milk size={22} />
            </span>
            <h2>Registration Summary</h2>
            <ul>
              <SummaryItem done={hasPhoto} label="Cow photo uploaded" />
              <SummaryItem done={hasBasicDetails} label="Basic details completed" />
              <SummaryItem done={hasProductionDetails} label="Milk details ready" />
              <SummaryItem done={hasVaccinationRecord} label="Vaccination record updated" />
              <SummaryItem done={hasReport} label="Health report attached" />
            </ul>
            <button className="addcow-submit" type="button" onClick={handleSubmit} disabled={loading}>
              {loading ? "Adding cow..." : "Add Cow"}
            </button>
          </div>
        </aside>
      </section>
    </main>
  );
}

function SectionTitle({ icon: Icon, step, title, text }) {
  return (
    <div className="addcow-section-title">
      <span>{step}</span>
      <Icon size={21} />
      <div>
        <h2>{title}</h2>
        <p>{text}</p>
      </div>
    </div>
  );
}

function SummaryItem({ done, label }) {
  return (
    <li className={done ? "done" : ""}>
      <CheckCircle2 size={16} />
      {label}
    </li>
  );
}

function getNextVaccinationInfo(dateString) {
  if (!dateString) {
    return {
      dueDateString: "Not available",
      status: "Add the last vaccination date to calculate the next yearly dose.",
    };
  }

  const lastDate = new Date(dateString);
  if (Number.isNaN(lastDate.getTime())) {
    return {
      dueDateString: "Invalid date",
      status: "Please verify the vaccination date.",
    };
  }

  const nextDate = new Date(lastDate);
  nextDate.setFullYear(nextDate.getFullYear() + 1);
  const diffDays = Math.ceil((nextDate - new Date()) / (1000 * 60 * 60 * 24));
  const dueDateString = nextDate.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  if (diffDays <= 0) {
    return { dueDateString, status: "Vaccination is due now." };
  }

  if (diffDays <= 30) {
    return { dueDateString, status: `Next vaccination is due in ${diffDays} days.` };
  }

  return { dueDateString, status: `Next vaccination is scheduled for ${dueDateString}.` };
}
