import { useEffect, useState } from "react";
import "./App.css";

const API = "http://localhost:3000/api";

export default function App() {
  const [domains, setDomains] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [slots, setSlots] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [courses, setCourses] = useState([]);

  const [selectedDomain, setSelectedDomain] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");
  const [selectedFaculties, setSelectedFaculties] = useState([]);

  const [timetable, setTimetable] = useState({});

  // ===== FETCH =====
  useEffect(() => {
    fetch(API + "/domains")
      .then((r) => r.json())
      .then(setDomains);
    fetch(API + "/slots")
      .then((r) => r.json())
      .then(setSlots);
    fetchCourses();
  }, []);

  function fetchCourses() {
    fetch(API + "/courses")
      .then((r) => r.json())
      .then(setCourses);
  }

  useEffect(() => {
    if (!selectedDomain) return;

    fetch(API + "/subjects?domain_id=" + selectedDomain)
      .then((r) => r.json())
      .then(setSubjects);
  }, [selectedDomain]);

  useEffect(() => {
    if (!selectedSubject) {
      setFaculties([]); // clear when nothing selected
      return;
    }

    fetch(API + "/faculties?subject_id=" + selectedSubject)
      .then((r) => r.json())
      .then((data) => {
        console.log("FACULTIES:", data); // 🔥 DEBUG
        setFaculties(data);
      })
      .catch((err) => console.error(err));

    console.log(selectedSubject);
    console.log(faculties);

    setSelectedFaculties([]);
  }, [selectedSubject]);

  // ===== LOGIC =====

  function toggleFaculty(id) {
    setSelectedFaculties((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id],
    );
  }

  function addCourse() {
    if (!selectedSubject || !selectedSlot) return;

    fetch(API + "/courses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        subject_id: selectedSubject,
        slot_id: selectedSlot,
        faculty_ids: selectedFaculties,
      }),
    }).then(() => {
      fetchCourses();
      setSelectedFaculties([]);
    });
  }

  function removeAll() {
    fetch(API + "/courses", { method: "DELETE" }).then(fetchCourses);
  }

  // 🔥 SLOT → SUBJECT MAP
  function generateTimetable() {
    const map = {};

    courses.forEach((c) => {
      if (!c.slot) return;
      map[c.slot] = c.subject;
    });

    setTimetable(map);
  }

  // 🔥 RENDER SLOT
  // Replace renderSlot — show slot code on top, subject name tiny below
  function renderSlot(slot) {
    if (!slot) return "";
    const subject = timetable[slot];
    if (!subject)
      return <span style={{ color: "#aaa", fontSize: 10 }}>{slot}</span>;
    return (
      <div style={{ lineHeight: 1.2 }}>
        <div style={{ fontSize: 10, fontWeight: 700 }}>{slot}</div>
        <div
          style={{
            fontSize: 9,
            fontWeight: 400,
            whiteSpace: "normal",
            wordBreak: "break-word",
          }}
        >
          {subject}
        </div>
      </div>
    );
  }

  // Replace getCellStyle — add fixed dimensions so cells don't blow up
  function getCellStyle(slot) {
    const hasSubject = !!timetable[slot];
    return {
      backgroundColor: hasSubject ? "#bbf7d0" : "white",
      fontWeight: hasSubject ? "bold" : "normal",
      maxWidth: 60, // prevent text from stretching the column
      overflow: "hidden",
      verticalAlign: "top",
      padding: "3px 2px",
    };
  }

  return (
    <main id="main">
      <section id="control-panel">
        <div id="dropdown-section">
          <select
            value={selectedDomain}
            onChange={(e) => setSelectedDomain(e.target.value)}
          >
            <option>Select Domain</option>
            {domains.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
          >
            <option>Select Subject</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          <select
            value={selectedSlot}
            onChange={(e) => setSelectedSlot(e.target.value)}
          >
            <option>Select Slot</option>
            {slots.map((s) => (
              <option key={s.id} value={s.id}>
                {s.code}
              </option>
            ))}
          </select>
        </div>

        <div id="faculty-area">
          <div id="faculty-select">
            <h3>Select Faculties</h3>

            <div className="faculty-list">
              {faculties.map((f) => (
                <button
                  key={f.id}
                  style={{
                    background: selectedFaculties.includes(f.id)
                      ? "lightgreen"
                      : "white",
                  }}
                  onClick={() => toggleFaculty(f.id)}
                >
                  {f.name}
                </button>
              ))}
            </div>
          </div>

          <div id="faculty-priority">
            <h3>Faculty Priority</h3>

            <div className="priority-list">
              {selectedFaculties.map((id) => {
                const f = faculties.find((x) => x.id === id);
                return <div key={id}>{f?.name}</div>;
              })}
            </div>
          </div>
        </div>

        <div id="panel-buttons">
          <button onClick={() => setSelectedFaculties([])}>Reset</button>
          <button onClick={addCourse}>Confirm</button>
        </div>
      </section>

      <section id="courses">
        <div id="courses-header">
          <h2>Your Courses</h2>
        </div>

        <div id="courses-body">
          {courses.map((c) => (
            <div key={c.id}>
              {c.subject} ({c.slot})
            </div>
          ))}
        </div>

        <div id="courses-footer">
          <button id="generate" onClick={generateTimetable}>
            Generate
          </button>

          <button id="remove" onClick={removeAll}>
            Remove all
          </button>
        </div>
      </section>

      <section id="timetable-section">
        <h2>Your Timetables</h2>

        <table
          border="1"
          cellPadding="0"
          style={{
            tableLayout: "fixed",
            width: "100%",
            wordBreak: "break-word",
          }}
        >
          <tbody>
            <tr>
              <th rowSpan="2">Mon</th>

              <td colSpan="3" style={getCellStyle("A1")}>
                {renderSlot("A1")}
              </td>
              <td colSpan="3" style={getCellStyle("F1")}>
                {renderSlot("F1")}
              </td>
              <td colSpan="3" style={getCellStyle("D1")}>
                {renderSlot("D1")}
              </td>
              <td colSpan="3" style={getCellStyle("TB1")}>
                {renderSlot("TB1")}
              </td>
              <td colSpan="3" style={getCellStyle("TG1")}>
                {renderSlot("TG1")}
              </td>

              <td colSpan="3"></td>

              <td colSpan="3" style={getCellStyle("A2")}>
                {renderSlot("A2")}
              </td>
              <td colSpan="3" style={getCellStyle("F2")}>
                {renderSlot("F2")}
              </td>
              <td colSpan="3" style={getCellStyle("D2")}>
                {renderSlot("D2")}
              </td>
              <td colSpan="3" style={getCellStyle("TB2")}>
                {renderSlot("TB2")}
              </td>
              <td colSpan="4" style={getCellStyle("TG2")}>
                {renderSlot("TG2")}
              </td>
            </tr>

            <tr>
              <td colSpan="6">L1+L2</td>
              <td colSpan="6">L3+L4</td>
              <td colSpan="3">L5+L6</td>

              <td colSpan="3"></td>

              <td colSpan="6">L31+L32</td>
              <td colSpan="6">L33+L34</td>
              <td colSpan="4">L35+L36</td>
            </tr>

            <tr>
              <th rowSpan="2">Tue</th>

              <td colSpan="3" style={getCellStyle("B1")}>
                {renderSlot("B1")}
              </td>
              <td colSpan="3" style={getCellStyle("G1")}>
                {renderSlot("G1")}
              </td>
              <td colSpan="3" style={getCellStyle("E1")}>
                {renderSlot("E1")}
              </td>
              <td colSpan="3" style={getCellStyle("TC1")}>
                {renderSlot("TC1")}
              </td>
              <td colSpan="3" style={getCellStyle("TAA1")}>
                {renderSlot("TAA1")}
              </td>

              <td colSpan="3"></td>

              <td colSpan="3" style={getCellStyle("B2")}>
                {renderSlot("B2")}
              </td>
              <td colSpan="3" style={getCellStyle("G2")}>
                {renderSlot("G2")}
              </td>
              <td colSpan="3" style={getCellStyle("E2")}>
                {renderSlot("E2")}
              </td>
              <td colSpan="3" style={getCellStyle("TC2")}>
                {renderSlot("TC2")}
              </td>
              <td colSpan="4" style={getCellStyle("TAA2")}>
                {renderSlot("TAA2")}
              </td>
            </tr>

            <tr>
              <td colSpan="6">L7+L8</td>
              <td colSpan="6">L9+L10</td>
              <td colSpan="3">L11+L12</td>

              <td colSpan="3"></td>

              <td colSpan="6">L37+L38</td>
              <td colSpan="6">L39+L40</td>
              <td colSpan="4">L41+L42</td>
            </tr>

            <tr>
              <th rowSpan="2">Wed</th>

              <td colSpan="3" style={getCellStyle("C1")}>
                {renderSlot("C1")}
              </td>
              <td colSpan="3" style={getCellStyle("A1")}>
                {renderSlot("A1")}
              </td>
              <td colSpan="3" style={getCellStyle("F1")}>
                {renderSlot("F1")}
              </td>
              <td colSpan="6"></td>

              <td colSpan="3"></td>

              <td colSpan="3" style={getCellStyle("C2")}>
                {renderSlot("C2")}
              </td>
              <td colSpan="3" style={getCellStyle("A2")}>
                {renderSlot("A2")}
              </td>
              <td colSpan="3" style={getCellStyle("F2")}>
                {renderSlot("F2")}
              </td>
              <td colSpan="3" style={getCellStyle("TD2")}>
                {renderSlot("TD2")}
              </td>
              <td colSpan="4" style={getCellStyle("TBB2")}>
                {renderSlot("TBB2")}
              </td>
            </tr>

            <tr>
              <td colSpan="6">L13+L14</td>
              <td colSpan="6">L15+L16</td>
              <td colSpan="3">L17+L18</td>

              <td colSpan="3"></td>

              <td colSpan="6">L43+L44</td>
              <td colSpan="6">L45+L46</td>
              <td colSpan="4">L47+L48</td>
            </tr>

            <tr>
              <th rowSpan="2">Thu</th>

              <td colSpan="3" style={getCellStyle("D1")}>
                {renderSlot("D1")}
              </td>
              <td colSpan="3" style={getCellStyle("B1")}>
                {renderSlot("B1")}
              </td>
              <td colSpan="3" style={getCellStyle("G1")}>
                {renderSlot("G1")}
              </td>
              <td colSpan="3" style={getCellStyle("TE1")}>
                {renderSlot("TE1")}
              </td>
              <td colSpan="3" style={getCellStyle("TCC1")}>
                {renderSlot("TCC1")}
              </td>

              <td colSpan="3"></td>

              <td colSpan="3" style={getCellStyle("D2")}>
                {renderSlot("D2")}
              </td>
              <td colSpan="3" style={getCellStyle("B2")}>
                {renderSlot("B2")}
              </td>
              <td colSpan="3" style={getCellStyle("G2")}>
                {renderSlot("G2")}
              </td>
              <td colSpan="3" style={getCellStyle("TE2")}>
                {renderSlot("TE2")}
              </td>
              <td colSpan="4" style={getCellStyle("TCC2")}>
                {renderSlot("TCC2")}
              </td>
            </tr>

            <tr>
              <td colSpan="6">L19+L20</td>
              <td colSpan="6">L21+L22</td>
              <td colSpan="3">L23+L24</td>

              <td colSpan="3"></td>

              <td colSpan="6">L49+L50</td>
              <td colSpan="6">L51+L52</td>
              <td colSpan="4">L53+L54</td>
            </tr>

            <tr>
              <th rowSpan="2">Fri</th>

              <td colSpan="3" style={getCellStyle("E1")}>
                {renderSlot("E1")}
              </td>
              <td colSpan="3" style={getCellStyle("C1")}>
                {renderSlot("C1")}
              </td>
              <td colSpan="3" style={getCellStyle("TA1")}>
                {renderSlot("TA1")}
              </td>
              <td colSpan="3" style={getCellStyle("TF1")}>
                {renderSlot("TF1")}
              </td>
              <td colSpan="3" style={getCellStyle("TD1")}>
                {renderSlot("TD1")}
              </td>

              <td colSpan="3"></td>

              <td colSpan="3" style={getCellStyle("E2")}>
                {renderSlot("E2")}
              </td>
              <td colSpan="3" style={getCellStyle("C2")}>
                {renderSlot("C2")}
              </td>
              <td colSpan="3" style={getCellStyle("TA2")}>
                {renderSlot("TA2")}
              </td>
              <td colSpan="3" style={getCellStyle("TF2")}>
                {renderSlot("TF2")}
              </td>
              <td colSpan="4" style={getCellStyle("TDD2")}>
                {renderSlot("TDD2")}
              </td>
            </tr>

            <tr>
              <td colSpan="6">L25+L26</td>
              <td colSpan="6">L27+L28</td>
              <td colSpan="3">L29+L30</td>

              <td colSpan="3"></td>

              <td colSpan="6">L55+L56</td>
              <td colSpan="6">L57+L58</td>
              <td colSpan="4">L59+L60</td>
            </tr>
          </tbody>
        </table>
      </section>
    </main>
  );
}
