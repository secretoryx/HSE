const links = document.querySelectorAll(".nav-link");
const sections = document.querySelectorAll(".content-section");
const pageTitle = document.getElementById("page-title");
const modalBackdrop = document.getElementById("modal-backdrop");
const modalTitle = document.getElementById("modal-title");
const modalCopy = document.getElementById("modal-copy");
const actionForm = document.getElementById("action-form");
const modalSubmit = document.getElementById("modal-submit");
const modalClose = document.getElementById("modal-close");
const modalCancel = document.getElementById("modal-cancel");
const toastStack = document.getElementById("toast-stack");
const STORAGE_KEY = "labotel-hse-dashboard-v1";

const titleMap = {
  overview: "HSE Command Overview",
  formulas: "HSE Formulas & Calculators",
  observations: "Observations Management",
  incidents: "Incidents & Investigations",
  permits: "Permit to Work Control",
  activities: "Activities & Training Records",
  "fire-alarms": "Fire Alarm Register",
  risk: "Risk Register",
  audits: "Audits & Inspections",
  training: "Training & Competency",
  assets: "Assets & PPE",
  documents: "Documents & Compliance",
  staff: "Staff Management",
  people: "People & Contractors",
  settings: "Settings & Master Data",
};

const seedData = {
  observation: {
    id: "OBS-402",
    status: "Open",
    actCondition: "Unsafe Act",
    positive: "No",
    issuedBy: "John Smith",
    responsible: "Ahmed Hassan",
    location: "Main Building",
    shift: "Day",
    observedAt: "04/01/2026 06:00 AM",
    relatedWith: "Health and Safety",
    internalExternal: "Internal",
    subcontractor: "No",
    risk: "High",
    hazards: "Working at Height, Electrical Hazard",
    dueDate: "04/04/2026 05:00 PM",
    activity: "Safety Inspection",
    description: "Worker observed working on scaffolding without proper fall protection equipment. Safety harness was available but not being used.",
    workStopped: "Yes",
    daysOpen: "6 Days Open",
    photo: "No photo available",
  },
  permit: {
    permitNo: "PTW-219",
    type: "Confined Space",
    location: "Utility tunnel C",
    exactLocation: "Utility tunnel C, service entry chamber",
    issuer: "H. Rahman",
    receiver: "Omar Nasser",
    requestedBy: "Facilities Maintenance",
    validFrom: "06 Apr 2026, 08:00",
    validUntil: "06 Apr 2026, 18:00",
    status: "Open",
    riskLevel: "High",
    gasTestRequired: "Yes",
    isolationsConfirmed: "Yes",
    rescuePlan: "Yes",
    ppeRequired: "Breathing apparatus, tripod, rescue line, helmet, gloves",
    description: "Entry into utility tunnel for valve replacement and confined space inspection.",
  },
  fireAlarm: {
    eventId: "FA-104",
    eventTime: "06 Apr 2026, 08:14",
    buildingName: "Block A",
    room: "Kitchen 2",
    deviceType: "Smoke Detector",
    respondedBy: "Security Team",
    responseTime: "3 min",
    resetTime: "11 min",
    status: "Closed",
    alarmClass: "False Alarm",
    violatorCompany: "NovaSteel",
    remarks: "Cooking smoke triggered detector. Toolbox talk issued.",
    technicianResetBy: "FM Technician",
    escalationLevel: "Level 1",
    correctiveAction: "Awareness briefing and kitchen exhaust inspection completed.",
  },
};

const sharedOptions = {
  yesNo: ["Yes", "No"],
  shifts: ["Day", "Night"],
  risk: ["Low", "Medium", "High", "Very High", "Critical"],
  locations: ["Main Building", "Workshop Area", "Administration Block", "Warehouse", "Loading Dock", "Outdoor Yard", "Utility Building"],
  hseStaff: ["John Smith", "Sarah Johnson", "David Chen", "Fatima Al-Mansouri"],
  responsiblePeople: ["Ahmed Hassan", "Maria Garcia", "Robert Williams", "James Brown"],
};

const actions = {
  export: simpleAction("Export dashboard data", "Choose what you want to export from the HSE system.", "Export", [
    selectField("dataset", "Dataset", ["Overview pack", "Observation register", "Permit register", "Training matrix", "Staff register"]),
    selectField("format", "Format", ["Excel", "PDF", "CSV"]),
  ], (values) => showToast("Export prepared", `${values.dataset} is ready as ${values.format}.`)),

  filter: simpleAction("Apply dashboard filter", "Narrow the dashboard to a site, shift, or responsible function.", "Apply filter", [
    selectField("site", "Site", ["Al Safa Metro Expansion", "North Utilities Hub", "HQ Warehouse"]),
    selectField("shift", "Shift", ["All shifts", "Day", "Night"]),
    textField("owner", "Owner", "HSE, Operations, Logistics..."),
  ], (values) => showToast("Filters applied", `Showing ${values.site} for ${values.shift.toLowerCase()}.`)),

  createAction: simpleAction("Create corrective action", "Add a new action to the workboard for follow-up.", "Create action", [
    textField("title", "Action title", "Close scaffold tagging gap"),
    textField("owner", "Owner", "Ahmed Jalil"),
    selectField("priority", "Priority", ["Critical", "High", "Medium", "Low"]),
    textareaField("notes", "Notes", "Describe the action, location, and due window...", true),
  ], (values) => {
    const board = document.querySelector(".workboard");
    const task = document.createElement("div");
    task.className = values.priority === "Critical" ? "task danger" : values.priority === "High" ? "task warn" : "task";
    task.innerHTML = `<strong>${escapeHtml(values.title)}</strong><p>Owner: ${escapeHtml(values.owner)} | Priority: ${escapeHtml(values.priority)} | ${escapeHtml(values.notes)}</p>`;
    board.prepend(task);
    showToast("Action created", `${values.title} was added to the workboard.`);
  }),

  viewAllCritical: simpleAction("Critical workboard summary", "This view lists open critical tasks currently shown on the overview board.", "Close", [], () => {
    showToast("Critical items reviewed", "The current workboard has been opened for review.");
  }),

  addObservation: {
    title: "Add New Observation",
    description: "Create a full observation record with site, hazard, responsibility, and HSE workflow settings.",
    submitLabel: "Save Observation",
    fields: observationFields(),
    onSubmit: (values) => {
      const tbody = document.getElementById("observations-table-body");
      const row = tbody.insertRow(0);
      row.innerHTML = `
        <td>${nextId("OBS")}</td>
        <td>${statusPill(values.status)}</td>
        <td>${escapeHtml(values.actCondition)}</td>
        <td>${escapeHtml(values.risk)}</td>
        <td>${escapeHtml(values.issuedBy)}</td>
        <td>${escapeHtml(values.location)}</td>
        <td>${escapeHtml(values.dueDate || "Pending")}</td>
        <td>${tableActions("viewObservation", "editObservation")}</td>
      `;
      bindDynamicActions(row);
      showToast("Observation added", `${values.actCondition} observation was added to the register.`);
    },
  },

  editObservation: {
    title: "Edit Observation",
    description: "Update the selected observation record using a full HSE workflow form.",
    submitLabel: "Update Observation",
    fields: observationFields(seedData.observation),
    onSubmit: (values) => {
      seedData.observation = { ...seedData.observation, ...values };
      showToast("Observation updated", `Observation ${seedData.observation.id} has been updated.`);
    },
  },

  viewObservation: {
    title: "View Observation",
    description: "Read the key details captured for this observation.",
    submitLabel: "Close",
    fields: [
      sectionField("Observation Summary"),
      readonlyField("Status", seedData.observation.status),
      readonlyField("Issued By", seedData.observation.issuedBy),
      readonlyField("Hazards", seedData.observation.hazards),
      readonlyField("Due Date", seedData.observation.dueDate),
      readonlyField("During which HSE activity was the observation issued?", seedData.observation.activity, true),
      readonlyField("Description", seedData.observation.description, true),
      readonlyField("Was the work stopped?", seedData.observation.workStopped),
      readonlyField("Days Open", seedData.observation.daysOpen),
      readonlyField("Photo", seedData.observation.photo, true),
    ],
    onSubmit: () => {},
  },

  reportIncident: {
    title: "Add New Incident",
    description: "Capture the incident category, timing, involved assets, injury status, and description.",
    submitLabel: "Save Incident",
    fields: [
      sectionField("Main Information"),
      selectField("incidentLocation", "Incident Location", sharedOptions.locations),
      selectField("incidentCategory", "Incident Category", ["First Aid", "Near Miss", "Property Damage", "Dropped Object", "Vehicle Incident", "LTI"]),
      textField("dateTime", "Date and Time", "04/06/2026 08:30 AM"),
      selectField("propertyDamage", "Any Property Damage?", sharedOptions.yesNo),
      selectField("workRelated", "Work Related?", sharedOptions.yesNo),
      selectField("hazardPreviouslyIdentified", "Was this hazard identified previously?", sharedOptions.yesNo),
      selectField("equipmentVehicle", "Any Equipment/Vehicle involved?", sharedOptions.yesNo),
      selectField("reportedExternal", "Reported to Client/External?", sharedOptions.yesNo),
      selectField("peopleInjured", "Are there people injured?", sharedOptions.yesNo),
      sectionField("Description"),
      textareaField("incidentDescription", "Incident Description", "Describe what happened...", true),
    ],
    onSubmit: (values) => {
      const timeline = document.getElementById("incident-timeline");
      const item = document.createElement("div");
      item.className = values.peopleInjured === "Yes" ? "timeline-item danger" : "timeline-item";
      item.innerHTML = `<strong>${nextId("INC")} | ${escapeHtml(values.incidentCategory)}</strong><p>Location: ${escapeHtml(values.incidentLocation)} | Work Related: ${escapeHtml(values.workRelated)} | ${escapeHtml(values.incidentDescription)}</p>`;
      timeline.prepend(item);
      showToast("Incident logged", `${values.incidentCategory} incident has been added.`);
    },
  },

  issuePermit: simpleAction("Issue permit to work", "Create a new live permit entry for controlled high-risk work.", "Issue Permit", [
    selectField("type", "Permit Type", ["Hot Work", "Confined Space", "Lifting", "Excavation", "Electrical"]),
    textField("location", "Location", "Utility tunnel C"),
    textField("issuer", "Issuer", "H. Rahman"),
    textField("receiver", "Receiver", "Omar Nasser"),
    textField("validUntil", "Valid Until", "06 Apr 2026, 18:00"),
    selectField("status", "Status", ["Open", "Extended", "Active"]),
  ], (values) => {
    const tbody = document.getElementById("permits-table-body");
    const row = tbody.insertRow(0);
    row.innerHTML = `<td>${nextId("PTW")}</td><td>${escapeHtml(values.type)}</td><td>${escapeHtml(values.location)}</td><td>${escapeHtml(values.issuer)}</td><td>${escapeHtml(values.receiver)}</td><td>${escapeHtml(values.validUntil)}</td><td>${statusPill(values.status)}</td><td>${tableActions("viewPermit", "editPermit")}</td>`;
    bindDynamicActions(row);
    showToast("Permit issued", `${values.type} permit created for ${values.location}.`);
  }),

  viewPermit: {
    title: "View Permit",
    description: "Review the selected permit-to-work details and control requirements.",
    submitLabel: "Close",
    fields: [
      sectionField("Permit Summary"),
      readonlyField("Permit Number", seedData.permit.permitNo),
      readonlyField("Permit Type", seedData.permit.type),
      readonlyField("Location", seedData.permit.location),
      readonlyField("Exact Work Location", seedData.permit.exactLocation),
      readonlyField("Issued By", seedData.permit.issuer),
      readonlyField("Permit Receiver", seedData.permit.receiver),
      readonlyField("Requested By", seedData.permit.requestedBy),
      readonlyField("Valid From", seedData.permit.validFrom),
      readonlyField("Valid Until", seedData.permit.validUntil),
      readonlyField("Status", seedData.permit.status),
      sectionField("Controls"),
      readonlyField("Risk Level", seedData.permit.riskLevel),
      readonlyField("Gas Test Required", seedData.permit.gasTestRequired),
      readonlyField("Isolations Confirmed", seedData.permit.isolationsConfirmed),
      readonlyField("Rescue Plan", seedData.permit.rescuePlan),
      readonlyField("PPE Required", seedData.permit.ppeRequired, true),
      readonlyField("Description", seedData.permit.description, true),
    ],
    onSubmit: () => {},
  },

  editPermit: {
    title: "Edit Permit",
    description: "Update permit controls, validity period, and responsible personnel.",
    submitLabel: "Update Permit",
    fields: [
      sectionField("Permit Details"),
      readonlyField("Permit Number", seedData.permit.permitNo),
      selectField("type", "Permit Type", ["Hot Work", "Confined Space", "Lifting", "Excavation", "Electrical"], seedData.permit.type),
      selectField("location", "Location", sharedOptions.locations, seedData.permit.location),
      textField("exactLocation", "Exact Work Location", "Utility tunnel C, service entry chamber", seedData.permit.exactLocation, true),
      textField("issuer", "Issued By", "H. Rahman", seedData.permit.issuer),
      textField("receiver", "Permit Receiver", "Omar Nasser", seedData.permit.receiver),
      textField("requestedBy", "Requested By", "Facilities Maintenance", seedData.permit.requestedBy),
      textField("validFrom", "Valid From", "06 Apr 2026, 08:00", seedData.permit.validFrom),
      textField("validUntil", "Valid Until", "06 Apr 2026, 18:00", seedData.permit.validUntil),
      selectField("status", "Status", ["Open", "Extended", "Active", "Suspended", "Closed"], seedData.permit.status),
      sectionField("Controls"),
      selectField("riskLevel", "Risk Level", sharedOptions.risk, seedData.permit.riskLevel),
      selectField("gasTestRequired", "Gas Test Required", sharedOptions.yesNo, seedData.permit.gasTestRequired),
      selectField("isolationsConfirmed", "Isolations Confirmed", sharedOptions.yesNo, seedData.permit.isolationsConfirmed),
      selectField("rescuePlan", "Rescue Plan Available", sharedOptions.yesNo, seedData.permit.rescuePlan),
      textareaField("ppeRequired", "PPE Required", "Breathing apparatus, tripod, rescue line, helmet, gloves", true, seedData.permit.ppeRequired),
      textareaField("description", "Work Description", "Describe the task, controls, and permit scope...", true, seedData.permit.description),
    ],
    onSubmit: (values) => {
      seedData.permit = { ...seedData.permit, ...values };
      const firstRow = document.querySelector("#permits-table-body tr");
      if (firstRow) {
        firstRow.children[1].textContent = values.type;
        firstRow.children[2].textContent = values.location;
        firstRow.children[3].textContent = values.issuer;
        firstRow.children[4].textContent = values.receiver;
        firstRow.children[5].textContent = values.validUntil;
        firstRow.children[6].innerHTML = statusPill(values.status);
      }
      showToast("Permit updated", `${seedData.permit.permitNo} has been updated.`);
    },
  },

  addActivity: {
    title: "Add New Activity",
    description: "Capture activity details, attendance, durations, and manager participation for the training and engagement register.",
    submitLabel: "Save Activity",
    fields: [
      sectionField("Activity Details"),
      selectField("activity", "Activities", ["Safety Training", "Toolbox Talk", "Emergency Drill", "Environmental Audit", "Safety Inspection", "Induction", "Risk Assessment", "Safety Meeting"]),
      selectField("deliveredBy", "Delivered By", sharedOptions.hseStaff),
      textField("attendees", "Number of Attendees", "18"),
      textField("duration", "Duration (minutes)", "90"),
      readonlyField("Hours (Auto Calculated)", "0.00"),
      selectField("topic", "Topic", ["Fall Protection", "Scaffold Safety", "Emergency Preparedness", "Environmental Awareness", "General HSE"]),
      selectField("location", "Location", sharedOptions.locations),
      selectField("relatedWith", "Related With", ["Health and Safety", "Environment", "Quality", "Operations"]),
      sectionField("Manager Attendance"),
      selectField("projectManagerAttended", "Project Manager/Director Attended?", sharedOptions.yesNo),
      selectField("constructionManagerAttended", "Construction Manager/Director Attended?", sharedOptions.yesNo),
      selectField("hseManagerAttended", "HSE Manager/Supervisor Attended?", sharedOptions.yesNo),
      selectField("environmentalManagerAttended", "Environmental Manager Attended?", sharedOptions.yesNo),
    ],
    onSubmit: (values) => {
      const tbody = document.getElementById("activities-table-body");
      const duration = Number(values.duration || 0);
      const hours = (duration / 60).toFixed(2);
      const row = tbody.insertRow(0);
      row.innerHTML = `<td>${tbody.rows.length}</td><td>${escapeHtml(values.activity)}</td><td>${escapeHtml(values.deliveredBy)}</td><td>${escapeHtml(values.attendees)}</td><td>${hours}</td><td>${escapeHtml(values.location)}</td><td>${tableActions("viewActivity", "addActivity")}</td>`;
      bindDynamicActions(row);
      showToast("Activity added", `${values.activity} was added with ${values.attendees} attendees.`);
    },
  },

  addFireAlarm: {
    title: "Add Fire Alarm Record",
    description: "Register a fire alarm activation with response and reset details.",
    submitLabel: "Save Fire Alarm Record",
    fields: [
      textField("eventTime", "Date & Time", "06 Apr 2026, 08:14"),
      textField("buildingName", "Building Name", "Block A"),
      textField("room", "Room", "Kitchen 2"),
      selectField("deviceType", "Device Type", ["Smoke Detector", "Heat Detector", "Manual Call Point", "Beam Detector", "Sounder Beacon"]),
      textField("respondedBy", "Responded By", "Security Team"),
      textField("responseTime", "Response Time", "3 min"),
      textField("resetTime", "Reset Time", "11 min"),
      selectField("status", "Status", ["Closed", "Under Review", "Open"]),
      selectField("alarmClass", "Alarm Class", ["False Alarm", "Real Alarm", "Test / Drill"]),
      textField("violatorCompany", "Violator Company", "NovaSteel"),
      textField("technicianResetBy", "Reset By", "FM Technician"),
      selectField("escalationLevel", "Escalation Level", ["Level 1", "Level 2", "Level 3"]),
      textareaField("remarks", "Remarks", "Describe the alarm cause and corrective action...", true),
      textareaField("correctiveAction", "Corrective Action", "List the action taken after the alarm...", true),
    ],
    onSubmit: (values) => {
      const tbody = document.getElementById("fire-alarm-table-body");
      const row = tbody.insertRow(0);
      row.innerHTML = `
        <td>${nextAlarmId()}</td>
        <td>${escapeHtml(values.eventTime)}</td>
        <td>${escapeHtml(values.buildingName)}</td>
        <td>${escapeHtml(values.room)}</td>
        <td>${escapeHtml(values.deviceType)}</td>
        <td>${escapeHtml(values.respondedBy)}</td>
        <td>${escapeHtml(values.responseTime)}</td>
        <td>${escapeHtml(values.resetTime)}</td>
        <td>${statusPill(values.status)}</td>
        <td>${escapeHtml(values.alarmClass)}</td>
        <td>${escapeHtml(values.violatorCompany)}</td>
        <td>${escapeHtml(values.remarks)}</td>
        <td>${tableActions("viewFireAlarm", "editFireAlarm")}</td>
      `;
      bindDynamicActions(row);
      showToast("Fire alarm record added", `${values.buildingName} / ${values.room} has been logged.`);
    },
  },

  viewFireAlarm: {
    title: "View Fire Alarm Record",
    description: "Review the emergency event details, response performance, and corrective actions.",
    submitLabel: "Close",
    fields: [
      sectionField("Event Summary"),
      readonlyField("Event ID", seedData.fireAlarm.eventId),
      readonlyField("Date & Time", seedData.fireAlarm.eventTime),
      readonlyField("Building Name", seedData.fireAlarm.buildingName),
      readonlyField("Room", seedData.fireAlarm.room),
      readonlyField("Device Type", seedData.fireAlarm.deviceType),
      readonlyField("Responded By", seedData.fireAlarm.respondedBy),
      readonlyField("Response Time", seedData.fireAlarm.responseTime),
      readonlyField("Reset Time", seedData.fireAlarm.resetTime),
      readonlyField("Status", seedData.fireAlarm.status),
      readonlyField("Alarm Class", seedData.fireAlarm.alarmClass),
      sectionField("Follow-up"),
      readonlyField("Violator Company", seedData.fireAlarm.violatorCompany),
      readonlyField("Reset By", seedData.fireAlarm.technicianResetBy),
      readonlyField("Escalation Level", seedData.fireAlarm.escalationLevel),
      readonlyField("Remarks", seedData.fireAlarm.remarks, true),
      readonlyField("Corrective Action", seedData.fireAlarm.correctiveAction, true),
    ],
    onSubmit: () => {},
  },

  editFireAlarm: {
    title: "Edit Fire Alarm Record",
    description: "Update the event details, responders, status, and corrective actions.",
    submitLabel: "Update Fire Alarm Record",
    fields: [
      sectionField("Event Summary"),
      readonlyField("Event ID", seedData.fireAlarm.eventId),
      textField("eventTime", "Date & Time", "06 Apr 2026, 08:14", seedData.fireAlarm.eventTime),
      textField("buildingName", "Building Name", "Block A", seedData.fireAlarm.buildingName),
      textField("room", "Room", "Kitchen 2", seedData.fireAlarm.room),
      selectField("deviceType", "Device Type", ["Smoke Detector", "Heat Detector", "Manual Call Point", "Beam Detector", "Sounder Beacon"], seedData.fireAlarm.deviceType),
      textField("respondedBy", "Responded By", "Security Team", seedData.fireAlarm.respondedBy),
      textField("responseTime", "Response Time", "3 min", seedData.fireAlarm.responseTime),
      textField("resetTime", "Reset Time", "11 min", seedData.fireAlarm.resetTime),
      selectField("status", "Status", ["Closed", "Under Review", "Open"], seedData.fireAlarm.status),
      selectField("alarmClass", "Alarm Class", ["False Alarm", "Real Alarm", "Test / Drill"], seedData.fireAlarm.alarmClass),
      sectionField("Follow-up"),
      textField("violatorCompany", "Violator Company", "NovaSteel", seedData.fireAlarm.violatorCompany),
      textField("technicianResetBy", "Reset By", "FM Technician", seedData.fireAlarm.technicianResetBy),
      selectField("escalationLevel", "Escalation Level", ["Level 1", "Level 2", "Level 3"], seedData.fireAlarm.escalationLevel),
      textareaField("remarks", "Remarks", "Describe the alarm cause and corrective action...", true, seedData.fireAlarm.remarks),
      textareaField("correctiveAction", "Corrective Action", "List the action taken after the alarm...", true, seedData.fireAlarm.correctiveAction),
    ],
    onSubmit: (values) => {
      seedData.fireAlarm = { ...seedData.fireAlarm, ...values };
      const firstRow = document.querySelector("#fire-alarm-table-body tr");
      if (firstRow) {
        firstRow.children[1].textContent = values.eventTime;
        firstRow.children[2].textContent = values.buildingName;
        firstRow.children[3].textContent = values.room;
        firstRow.children[4].textContent = values.deviceType;
        firstRow.children[5].textContent = values.respondedBy;
        firstRow.children[6].textContent = values.responseTime;
        firstRow.children[7].textContent = values.resetTime;
        firstRow.children[8].innerHTML = statusPill(values.status);
        firstRow.children[9].textContent = values.alarmClass;
        firstRow.children[10].textContent = values.violatorCompany;
        firstRow.children[11].textContent = values.remarks;
      }
      showToast("Fire alarm record updated", `${seedData.fireAlarm.eventId} has been updated.`);
    },
  },

  viewActivity: {
    title: "View Activity",
    description: "Review the main details captured for this activity record.",
    submitLabel: "Close",
    fields: [
      readonlyField("Activity", "Toolbox Talk"),
      readonlyField("Delivered By", "David Chen"),
      readonlyField("Number of Attendees", "22"),
      readonlyField("Duration", "30 minutes"),
      readonlyField("Hours", "0.50"),
      readonlyField("Location", "Workshop Area"),
      readonlyField("Related With", "Health and Safety"),
    ],
    onSubmit: () => {},
  },

  newRisk: simpleAction("Add risk entry", "Register a new risk with a residual rating.", "Add Risk", [
    textField("risk", "Risk title", "Temporary works instability"),
    selectField("rating", "Residual rating", ["Very High", "High", "Medium", "Low"]),
  ], (values) => {
    const list = document.getElementById("risk-list");
    const li = document.createElement("li");
    li.innerHTML = `<span>${escapeHtml(values.risk)}</span><strong>${escapeHtml(values.rating)}</strong>`;
    list.prepend(li);
    showToast("Risk added", `${values.risk} was added to the register.`);
  }),

  scheduleAudit: simpleAction("Schedule audit", "Plan an assurance or inspection event.", "Schedule Audit", [
    textField("date", "Date", "12 Apr"),
    textField("name", "Audit name", "Monthly lifting assurance"),
    textareaField("notes", "Notes", "Scope, attendees, and focus area...", true),
  ], (values) => {
    const timeline = document.getElementById("audit-timeline");
    const item = document.createElement("div");
    item.className = "timeline-item";
    item.innerHTML = `<strong>${escapeHtml(values.date)} | ${escapeHtml(values.name)}</strong><p>${escapeHtml(values.notes)}</p>`;
    timeline.prepend(item);
    showToast("Audit scheduled", `${values.name} is now on the audit plan.`);
  }),

  assignTraining: simpleAction("Assign training", "Book competency training and add it to the expiry tracker.", "Assign Training", [
    textField("name", "Worker name", "Hassan Malik"),
    textField("employer", "Employer", "CoreBuild"),
    textField("course", "Certification", "Working at height"),
    textField("expires", "Expiry / session date", "12 Apr 2026"),
    selectField("status", "Status", ["Booked", "Due Soon", "Current"]),
  ], (values) => {
    const tbody = document.getElementById("training-table-body");
    const row = tbody.insertRow(0);
    row.innerHTML = `<td>${escapeHtml(values.name)}</td><td>${escapeHtml(values.employer)}</td><td>${escapeHtml(values.course)}</td><td>${escapeHtml(values.expires)}</td><td>${statusPill(values.status)}</td>`;
    showToast("Training assigned", `${values.course} assigned to ${values.name}.`);
  }),

  addAsset: simpleAction("Add asset", "Register a new asset or PPE-controlled item.", "Add Asset", [
    textField("asset", "Asset name", "4-gas detector"),
    textField("tag", "Asset tag", "GAS-014"),
    textareaField("notes", "Notes", "Inspection status, assigned crew, storage location...", true),
  ], (values) => showToast("Asset registered", `${values.asset} (${values.tag}) has been registered.`)),

  uploadDocument: simpleAction("Upload compliance document", "Add a controlled or approval document to the register.", "Upload Document", [
    textField("document", "Document title", "Lift plan rev 3"),
    selectField("type", "Document type", ["Controlled", "Approval", "Environmental"]),
    textField("owner", "Owner", "Package Lead"),
    textField("review", "Review date", "15 Apr 2026"),
    selectField("status", "Status", ["Pending", "In Review", "Current"]),
  ], (values) => {
    const tbody = document.getElementById("documents-table-body");
    const row = tbody.insertRow(0);
    row.innerHTML = `<td>${escapeHtml(values.document)}</td><td>${escapeHtml(values.type)}</td><td>${escapeHtml(values.owner)}</td><td>${escapeHtml(values.review)}</td><td>${statusPill(values.status)}</td>`;
    showToast("Document added", `${values.document} was added to compliance records.`);
  }),

  addStaff: {
    title: "Add New Staff",
    description: "Create a new staff profile used across observation, incident, and permit workflows.",
    submitLabel: "Save Staff",
    fields: [
      textField("fullName", "Full Name", "Michael Turner"),
      selectField("staffType", "Staff Type", ["HSE", "Production", "Quality", "Administration"]),
      textField("jobTitle", "Job Title", "HSE Advisor"),
      textField("nationality", "Nationality", "United Arab Emirates"),
      textField("phone", "Phone", "+971-50-000-0000"),
      textField("email", "Email", "michael.turner@example.com"),
      selectField("status", "Status", ["Active", "Inactive"]),
    ],
    onSubmit: (values) => {
      const tbody = document.getElementById("staff-table-body");
      const row = tbody.insertRow(0);
      row.innerHTML = `<td>${escapeHtml(values.fullName)}</td><td>${escapeHtml(values.staffType)}</td><td>${escapeHtml(values.jobTitle)}</td><td>${escapeHtml(values.nationality)}</td><td>${escapeHtml(values.phone)}</td><td>${escapeHtml(values.email)}</td><td>${statusPill(values.status)}</td><td><div class="table-actions"><button class="table-btn table-btn-edit" data-action="editStaff">Edit</button></div></td>`;
      bindDynamicActions(row);
      showToast("Staff added", `${values.fullName} has been added to staff management.`);
    },
  },

  editStaff: simpleAction("Edit Staff", "Update the selected staff member profile.", "Update Staff", [
    textField("fullName", "Full Name", "John Smith"),
    selectField("staffType", "Staff Type", ["HSE", "Production", "Quality", "Administration"]),
    textField("jobTitle", "Job Title", "HSE Manager"),
    textField("nationality", "Nationality", "United States"),
    textField("phone", "Phone", "+1-555-0101"),
    textField("email", "Email", "john.smith@example.com"),
    selectField("status", "Status", ["Active", "Inactive"]),
  ], (values) => showToast("Staff updated", `${values.fullName} profile updated.`)),

  addContractor: simpleAction("Add contractor", "Register a contractor company for workforce assurance tracking.", "Add Contractor", [
    textField("company", "Company", "LiftPro"),
    textField("compliance", "Compliance score", "82%"),
  ], (values) => {
    const bars = document.querySelector("#people .h-bars");
    const row = document.createElement("div");
    row.innerHTML = `<span>${escapeHtml(values.company)}</span><i style="width: ${clampPercent(values.compliance)}"></i><strong>${escapeHtml(values.compliance)}</strong>`;
    bars.prepend(row);
    showToast("Contractor added", `${values.company} is now tracked in contractor compliance.`);
  }),

  editCompany: simpleAction("Update Company Information", "Maintain the company, project, and contact details used across the system.", "Save Company", [
    textField("companyName", "Company Name", "Demo Construction Company"),
    textField("projectName", "Project Name", "Demo Project Site"),
    textField("projectLocation", "Project Location", "Demo Location"),
    textField("userEmail", "User Email", "demo@hsebox.com"),
  ], () => showToast("Settings updated", "Company information has been updated.")),

  uploadLogo: simpleAction("Upload Company Logo", "Attach a company logo for reports and documents.", "Save Logo", [
    textField("logoName", "Logo file name", "company-logo.png"),
  ], (values) => showToast("Logo queued", `${values.logoName} has been attached for branding.`)),

  filterStaff: simpleAction("Filter staff", "Filter the staff register by type or status.", "Apply Filter", [
    selectField("staffType", "Staff Type", ["All", "HSE", "Production", "Quality", "Administration"]),
    selectField("status", "Status", ["All", "Active", "Inactive"]),
  ], (values) => showToast("Staff filters applied", `Showing ${values.staffType} staff with status ${values.status}.`)),

  exportStaff: simpleAction("Export staff register", "Prepare the staff register for export.", "Export", [
    selectField("format", "Format", ["Excel", "PDF"]),
  ], (values) => showToast("Staff export prepared", `Staff register export prepared as ${values.format}.`)),

  reviewApp: simpleAction("Review the app", "Capture customer feedback for the platform.", "Submit", [
    textareaField("feedback", "Feedback", "Share your feedback about the HSE management system...", true),
  ], () => showToast("Thank you", "Your review has been recorded.")),

  contactSupport: simpleAction("Contact support", "Send a message to support.", "Send", [
    textField("subject", "Subject", "Need help with setup"),
    textareaField("message", "Message", "Describe the issue or request...", true),
  ], () => showToast("Support request sent", "The support team has received your message.")),
};

let activeAction = null;
const counters = { OBS: 402, INC: 118, PTW: 219 };
let fireAlarmCounter = 104;

links.forEach((link) => {
  link.addEventListener("click", () => {
    const sectionId = link.dataset.section;
    links.forEach((item) => item.classList.toggle("active", item === link));
    sections.forEach((section) => section.classList.toggle("active", section.id === sectionId));
    pageTitle.textContent = titleMap[sectionId] ?? "HSE Dashboard";
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
});

document.querySelectorAll(".donut").forEach((donut) => {
  const percent = Number(donut.dataset.percent || 0);
  donut.style.setProperty("--percent", `${percent}`);
});

setupFormulaCalculators();
loadPersistedState();

bindDynamicActions(document);

modalClose.addEventListener("click", closeModal);
modalCancel.addEventListener("click", closeModal);
modalBackdrop.addEventListener("click", (event) => {
  if (event.target === modalBackdrop) closeModal();
});

actionForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!activeAction) return;
  const config = actions[activeAction];
  const values = Object.fromEntries(new FormData(actionForm).entries());
  config.onSubmit(values);
  persistState();
  closeModal();
});

function bindDynamicActions(root) {
  root.querySelectorAll("[data-action]").forEach((button) => {
    if (button.dataset.bound === "true") return;
    button.dataset.bound = "true";
    button.addEventListener("click", () => openAction(button.dataset.action));
  });
}

function setupFormulaCalculators() {
  bindFormula(["trir-incidents", "trir-hours"], "trir-result", () => {
    const incidents = readNumber("trir-incidents");
    const hours = readNumber("trir-hours");
    return hours > 0 ? ((incidents * 200000) / hours).toFixed(2) : "0.00";
  }, "formula-kpi-trir");

  bindFormula(["ltifr-lti", "ltifr-hours"], "ltifr-result", () => {
    const lti = readNumber("ltifr-lti");
    const hours = readNumber("ltifr-hours");
    return hours > 0 ? ((lti * 1000000) / hours).toFixed(2) : "0.00";
  }, "formula-kpi-ltifr");

  bindFormula(["severity-days", "severity-hours"], "severity-result", () => {
    const days = readNumber("severity-days");
    const hours = readNumber("severity-hours");
    return hours > 0 ? ((days * 200000) / hours).toFixed(2) : "0.00";
  });

  bindFormula(["closure-closed", "closure-total"], "closure-result", () => {
    const closed = readNumber("closure-closed");
    const total = readNumber("closure-total");
    return total > 0 ? `${((closed / total) * 100).toFixed(2)}%` : "0.00%";
  }, "formula-kpi-closure");

  bindFormula(["training-hours-total", "training-attendees"], "training-ratio-result", () => {
    const hours = readNumber("training-hours-total");
    const attendees = readNumber("training-attendees");
    return attendees > 0 ? `${(hours / attendees).toFixed(2)} hrs` : "0.00 hrs";
  });

  bindFormula(["ppe-compliant", "ppe-total"], "ppe-result", () => {
    const compliant = readNumber("ppe-compliant");
    const total = readNumber("ppe-total");
    return total > 0 ? `${((compliant / total) * 100).toFixed(2)}%` : "0.00%";
  }, "formula-kpi-ppe");
}

function bindFormula(inputIds, resultId, calculate, mirrorId = null) {
  const result = document.getElementById(resultId);
  if (!result) return;
  const render = () => {
    const value = calculate();
    result.textContent = value;
    if (mirrorId) {
      const mirror = document.getElementById(mirrorId);
      if (mirror) mirror.textContent = value;
    }
  };
  inputIds.forEach((id) => {
    const input = document.getElementById(id);
    if (input) input.addEventListener("input", render);
  });
  render();
}

function readNumber(id) {
  const element = document.getElementById(id);
  return Number(element?.value || 0);
}

function openAction(actionKey) {
  const config = actions[actionKey];
  if (!config) return;
  activeAction = actionKey;
  modalTitle.textContent = config.title;
  modalCopy.textContent = config.description;
  modalSubmit.textContent = config.submitLabel;
  actionForm.innerHTML = config.fields.map(renderField).join("");
  modalSubmit.hidden = config.fields.every((field) => field.type === "readonly" || field.type === "section");
  modalBackdrop.hidden = false;
}

function closeModal() {
  modalBackdrop.hidden = true;
  actionForm.innerHTML = "";
  modalSubmit.hidden = false;
  activeAction = null;
}

function renderField(field) {
  if (field.type === "section") {
    return `<div class="form-section"><h4>${escapeHtml(field.title)}</h4>${field.copy ? `<p>${escapeHtml(field.copy)}</p>` : ""}</div>`;
  }

  if (field.type === "readonly") {
    return `<div class="field readonly ${field.full ? "full" : ""}"><label>${escapeHtml(field.label)}</label><strong>${escapeHtml(field.value)}</strong></div>`;
  }

  const fullClass = field.full ? "field full" : "field";

  if (field.type === "select") {
    return `<div class="${fullClass}"><label for="${field.name}">${escapeHtml(field.label)}</label><select id="${field.name}" name="${field.name}" required>${field.options.map((option) => `<option value="${escapeHtml(option)}"${option === field.value ? " selected" : ""}>${escapeHtml(option)}</option>`).join("")}</select></div>`;
  }

  if (field.type === "textarea") {
    return `<div class="${fullClass}"><label for="${field.name}">${escapeHtml(field.label)}</label><textarea id="${field.name}" name="${field.name}" placeholder="${escapeHtml(field.placeholder || "")}" required>${escapeHtml(field.value || "")}</textarea></div>`;
  }

  return `<div class="${fullClass}"><label for="${field.name}">${escapeHtml(field.label)}</label><input id="${field.name}" name="${field.name}" type="${field.type}" placeholder="${escapeHtml(field.placeholder || "")}" value="${escapeHtml(field.value || "")}" required /></div>`;
}

function observationFields(values = {}) {
  return [
    selectField("status", "Status", ["Open", "Closed", "In Review"], values.status),
    selectField("actCondition", "Act/Condition", ["Unsafe Act", "Unsafe Condition", "Positive Observation"], values.actCondition),
    selectField("positive", "It's a Positive Observation?", sharedOptions.yesNo, values.positive),
    selectField("issuedBy", "Observation issued by", sharedOptions.hseStaff, values.issuedBy),
    selectField("responsible", "Responsible to take action", sharedOptions.responsiblePeople, values.responsible),
    selectField("location", "Location", sharedOptions.locations, values.location),
    selectField("shift", "Shift", sharedOptions.shifts, values.shift),
    textField("observedAt", "Date of Observation", "04/01/2026 06:00 AM", values.observedAt),
    selectField("relatedWith", "Related with", ["Health and Safety", "Environment", "Quality"], values.relatedWith),
    selectField("internalExternal", "Internal / External observation", ["Internal", "External"], values.internalExternal),
    selectField("subcontractor", "Observation from subcontractor", sharedOptions.yesNo, values.subcontractor),
    selectField("risk", "Risk", sharedOptions.risk, values.risk),
    selectField("hazards", "Hazards", ["Working at Height", "Electrical Hazard", "Housekeeping", "Excavation", "Manual Handling"], values.hazards),
    textField("photo", "Photo internal link", "Browse", values.photo),
    textField("dueDate", "Due Date", "04/04/2026 05:00 PM", values.dueDate),
    selectField("activity", "During which HSE activity was the observation issued?", ["Safety Inspection", "Toolbox Talk", "Audit", "Site Walk", "Training"], values.activity, true),
    textareaField("description", "Description", "Describe the observation...", true, values.description),
    selectField("workStopped", "Was the work stopped?", sharedOptions.yesNo, values.workStopped),
  ];
}

function showToast(title, message) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerHTML = `<strong>${escapeHtml(title)}</strong><span>${escapeHtml(message)}</span>`;
  toastStack.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
}

function nextId(prefix) {
  counters[prefix] += 1;
  return `${prefix}-${counters[prefix]}`;
}

function nextAlarmId() {
  fireAlarmCounter += 1;
  return `FA-${fireAlarmCounter}`;
}

function tableActions(viewAction, editAction) {
  return `<div class="table-actions"><button class="table-btn table-btn-view" data-action="${viewAction}">View</button><button class="table-btn table-btn-edit" data-action="${editAction}">Edit</button></div>`;
}

function statusPill(label) {
  const normalized = label.toLowerCase();
  let className = "status-progress";
  if (["open", "due soon", "pending"].includes(normalized)) className = "status-open";
  if (["closed", "active", "current"].includes(normalized)) className = "status-closed";
  return `<span class="status-pill ${className}">${escapeHtml(label)}</span>`;
}

function clampPercent(value) {
  const numeric = Number(String(value).replace("%", ""));
  if (Number.isNaN(numeric)) return "50%";
  return `${Math.max(8, Math.min(100, numeric))}%`;
}

function textField(name, label, placeholder = "", value = "", full = false) {
  return { type: "text", name, label, placeholder, value, full };
}

function textareaField(name, label, placeholder = "", full = false, value = "") {
  return { type: "textarea", name, label, placeholder, full, value };
}

function selectField(name, label, options, value = "", full = false) {
  return { type: "select", name, label, options, value, full };
}

function readonlyField(label, value, full = false) {
  return { type: "readonly", label, value, full };
}

function sectionField(title, copy = "") {
  return { type: "section", title, copy };
}

function simpleAction(title, description, submitLabel, fields, onSubmit) {
  return { title, description, submitLabel, fields, onSubmit };
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function persistState() {
  const state = {
    observationsTable: document.getElementById("observations-table-body")?.innerHTML || "",
    permitsTable: document.getElementById("permits-table-body")?.innerHTML || "",
    activitiesTable: document.getElementById("activities-table-body")?.innerHTML || "",
    fireAlarmTable: document.getElementById("fire-alarm-table-body")?.innerHTML || "",
    riskList: document.getElementById("risk-list")?.innerHTML || "",
    incidentTimeline: document.getElementById("incident-timeline")?.innerHTML || "",
    auditTimeline: document.getElementById("audit-timeline")?.innerHTML || "",
    trainingTable: document.getElementById("training-table-body")?.innerHTML || "",
    documentsTable: document.getElementById("documents-table-body")?.innerHTML || "",
    staffTable: document.getElementById("staff-table-body")?.innerHTML || "",
    contractorBars: document.querySelector("#people .h-bars")?.innerHTML || "",
    seedData,
    counters,
    fireAlarmCounter,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadPersistedState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;

  try {
    const state = JSON.parse(raw);
    restoreHtml("observations-table-body", state.observationsTable);
    restoreHtml("permits-table-body", state.permitsTable);
    restoreHtml("activities-table-body", state.activitiesTable);
    restoreHtml("fire-alarm-table-body", state.fireAlarmTable);
    restoreHtml("risk-list", state.riskList);
    restoreHtml("incident-timeline", state.incidentTimeline);
    restoreHtml("audit-timeline", state.auditTimeline);
    restoreHtml("training-table-body", state.trainingTable);
    restoreHtml("documents-table-body", state.documentsTable);
    restoreHtml("staff-table-body", state.staffTable);

    const contractorBars = document.querySelector("#people .h-bars");
    if (contractorBars && state.contractorBars) {
      contractorBars.innerHTML = state.contractorBars;
    }

    if (state.seedData) {
      Object.assign(seedData, state.seedData);
    }

    if (state.counters) {
      Object.assign(counters, state.counters);
    }

    if (typeof state.fireAlarmCounter === "number") {
      fireAlarmCounter = state.fireAlarmCounter;
    }

    bindDynamicActions(document);
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function restoreHtml(id, html) {
  const element = document.getElementById(id);
  if (element && html) {
    element.innerHTML = html;
  }
}
