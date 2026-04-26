import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import useGlobalReducer from "../hooks/useGlobalReducer";

export const FichaPaciente = () => {
    const { store, dispatch } = useGlobalReducer();
    const p = store.pacienteActual;
    const navigate = useNavigate();
    const [editando, setEditando] = useState(false);
    const [formData, setFormData] = useState({});

    useEffect(() => { if (p) setFormData(p); }, [p, editando]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleGuardarCambios = async () => {
        const token = localStorage.getItem("token");
        try {
            const resp = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/pacientes/${p.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                body: JSON.stringify(formData)
            });
            if (resp.ok) {
                const data = await resp.json();
                dispatch({ type: "select_patient", payload: data });
                setEditando(false);
                alert("¡Datos actualizados!");
            }
        } catch (error) { console.error(error); }
    };

    if (!p) {
        return (
            <div className="container py-5 text-center">
                <div className="card border-0 shadow-sm p-5 rounded-4 bg-white">
                    <i className="fas fa-user-injured fa-3x mb-3 text-muted"></i>
                    <h4 className="fw-bold text-secondary">Consulta de Pacientes</h4>
                    <p className="text-muted mb-4">No hay un paciente seleccionado actualmente.</p>
                    <button className="btn btn-primary" onClick={() => navigate("/pacientes")}>
                        Ir al Directorio de Pacientes
                    </button>
                </div>
            </div>
        );
    }

    const detectarAlertas = () => {
        let alertas = [];
        if (p.embarazo === "SI") {
            alertas.push({
                msg: "ALERTA: PACIENTE EMBARAZADA",
                color: "#dc3545",
                icon: "fa-baby",
                prot: "¡CRÍTICO! Prohibido radiografías sin protección/justificación. Revisar compatibilidad de fármacos."
            });
        }

        // Glucosa
        const glucosaVal = parseFloat(p.glucosa);
        if (glucosaVal > 180) {
            alertas.push({
                msg: `GLUCOSA ALTA: ${glucosaVal} mg/dL`,
                color: "#fd7e14",
                icon: "fa-droplet",
                prot: "Riesgo de infección y retraso en cicatrización. Valorar profilaxis antibiótica."
            });
        }

        // Saturación de Oxígeno
        const oxygen = parseFloat(p.spo2);
        if (oxygen > 0 && oxygen < 94) {
            alertas.push({
                msg: `SpO2 BAJA: ${oxygen}%`,
                color: "#ffc107",
                icon: "fa-lungs",
                prot: "Saturación de oxígeno por debajo del nivel óptimo. Precaución en procedimientos largos."
            });
        }
        const alergiasMap = [
            { key: "alergia_penicilina", msg: "ALERGIA: PENICILINA", prot: "Riesgo de shock. No administrar derivados." },
            { key: "alergia_terramicina", msg: "ALERGIA: TERRAMICINA", prot: "Evitar tetraciclinas." },
            { key: "alergia_anestesia", msg: "ALERGIA: ANESTESIA", prot: "Usar alternativa sin vasoconstrictor." },
            { key: "alergia_latex", msg: "ALERGIA: LÁTEX", prot: "Protocolo libre de látex." },
            { key: "alergia_aines", msg: "ALERGIA: AINEs / ASPIRINA", prot: "Evitar antiinflamatorios no esteroideos." }
        ];

        alergiasMap.forEach(a => {
            if (p[a.key] === "SI") alertas.push({ msg: a.msg, color: "#e8888c", icon: "fa-skull-crossbones", prot: a.prot });
        });

        // Riesgos Médicos y Bioseguridad
        const riesgosMap = [
            { key: "hepatitis", msg: "RIESGO: HEPATITIS", icon: "fa-virus", color: "#6f42c1", prot: "Protocolo biológico. Esterilización nivel 3." },
            { key: "tuberculosis", msg: "RIESGO: TUBERCULOSIS", icon: "fa-lungs", color: "#6f42c1", prot: "Transmisión aérea. Mascarilla FFP3." },
            { key: "vih", msg: "RIESGO: VIH+", icon: "fa-biohazard", color: "#6f42c1", prot: "Inmunodepresión. Cuidado infecciones post-op." },
            { key: "osteoporosis", msg: "ALERTA: BIFOSFONATOS", icon: "fa-bone", color: "#fd7e14", prot: "¡PELIGRO! Riesgo osteonecrosis en cirugía." },
            { key: "radiacion_cabeza", msg: "ALERTA: RADIOTERAPIA", icon: "fa-radiation", color: "#fd7e14", prot: "Fragilidad ósea y xerostomía detectada." }
        ];

        riesgosMap.forEach(r => {
            if (p[r.key] === "SI") alertas.push({ msg: r.msg, color: r.color, icon: r.icon, prot: r.prot });
        });

        if (p.alergia_otros) alertas.push({ msg: `OTRAS: ${p.alergia_otros}`, color: "#e8888c", icon: "fa-exclamation-triangle", prot: "Verificar historial" });

        return alertas;
    };

    const alertasCriticas = detectarAlertas();

    const esPesoSaludable = () => {
        if (!p.peso || !p.imc_ideal || p.imc_ideal === "--") return false;

        const [min, max] = p.imc_ideal.replace(" kg", "").split(" - ").map(Number);
        const pesoActual = Number(p.peso);

        return pesoActual >= min && pesoActual <= max;
    };

    const saludable = esPesoSaludable();

    const handleEliminarDesdeFicha = async (id) => {
        if (!window.confirm("¿Estás seguro de eliminar permanentemente este paciente?")) return;

        const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/pacientes/${id}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
        });

        if (response.ok) {
            dispatch({ type: "delete_patient", payload: id });
            navigate("/pacientes");
        }
    };

    return (
        <div className="container-fluid py-4 bg-light min-vh-100">

            <button
                className="btn shadow-sm d-flex align-items-center gap-2 px-4"
                style={{
                    backgroundColor: "#566873",
                    color: "white",
                    borderRadius: "12px",
                    border: "none",
                    height: "45px"
                }}
                onClick={() => navigate("/pacientes")}
            >
                <i className="fas fa-search"></i>
                <span className="fw-bold">Nueva Búsqueda</span>
            </button>

            <div className="sticky-top pt-2" style={{ zIndex: 1050, top: '10px', pointerEvents: 'none' }}>
                <div className="d-flex flex-wrap gap-3 justify-content-center">
                    {alertasCriticas.map((alerta, index) => (
                        <div key={index} className="alert d-flex align-items-center border-0 shadow-lg m-0 text-white mi-alerta-viva" title={alerta.prot}
                            style={{ backgroundColor: alerta.color, borderRadius: "14px", cursor: "help", pointerEvents: 'auto', padding: '12px 20px', minWidth: '280px', flex: '0 1 auto', borderBottom: '4px solid rgba(0,0,0,0.2)' }}>
                            <i className={`fas ${alerta.icon} me-3 fa-lg`}></i>
                            <div style={{ lineHeight: '1.2' }}>
                                <small className="d-block opacity-75" style={{ fontSize: '0.65rem', fontWeight: 'bold' }}>AVISO MÉDICO</small>
                                <strong className="text-uppercase" style={{ fontSize: '0.9rem' }}>{alerta.msg}</strong>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* 2. CABECERA DE IDENTIDAD */}
            <div className="d-flex justify-content-between align-items-center mb-4 p-4 rounded-4 shadow-sm bg-white border-start border-5 mt-3" style={{ borderColor: "#e8888c" }}>
                <div>
                    <h2 className="mb-0 fw-bold" style={{ color: "#566873" }}>
                        {editando ? (
                            <div className="d-flex gap-2">
                                <input name="nombre" className="form-control" value={formData.nombre || ""} onChange={handleInputChange} />
                                <input name="apellidos" className="form-control" value={formData.apellidos || ""} onChange={handleInputChange} />
                            </div>
                        ) : (
                            `${p.nombre} ${p.apellidos}`
                        )}
                        {p.embarazo === "SI" && <i className="fas fa-baby ms-3 text-danger animate__animated animate__flash animate__infinite"></i>}
                    </h2>
                    <div className="d-flex gap-2 mt-2">
                        <span className="badge px-3 py-2" style={{ backgroundColor: "#93bbbf" }}>Paciente Activo</span>
                        {saludable && <span className="badge bg-success px-3 py-2"><i className="fas fa-medal me-1"></i> Peso Saludable</span>}
                    </div>
                </div>
                <div className="text-end">
                    <p className="mb-0 text-muted small uppercase fw-bold">Última actualización</p>
                    <p className="fw-bold h5" style={{ color: "#566873" }}>{new Date().toLocaleDateString()}</p>
                </div>
            </div>

            {/* 3. WIDGETS DE CONSTANTES */}
            <div className="row g-3 mb-3 text-center">
                <div className="col-md-4">
                    <div className="p-3 rounded-4 bg-white shadow-sm border-bottom border-4" style={{ borderColor: "#93bbbf" }}>
                        <p className="small text-muted mb-0">Peso Actual</p>
                        <h5 className="fw-bold mb-0">
                            {editando ? (
                                <input name="peso" type="number" className="form-control form-control-sm text-center fw-bold"
                                    value={formData.peso || ""} onChange={handleInputChange} style={{ maxWidth: "100px", margin: "0 auto" }} />
                            ) : (
                                `${p.peso || "--"} kg`
                            )}
                        </h5>
                    </div>
                </div>
                {/* ... Edad e IMC se calculan, así que los dejamos solo lectura ... */}
                <div className="col-md-4">
                    <div className="p-3 rounded-4 bg-white shadow-sm border-bottom border-4" style={{ borderColor: saludable ? "#28a745" : "#ffc107" }}>
                        <p className="small text-muted mb-0">Objetivo Saludable</p>
                        <h5 className="fw-bold mb-0">{p.imc_ideal || "--"}</h5>
                    </div>
                </div>
                <div className="col-md-4">
                    <div className="p-3 rounded-4 bg-white shadow-sm border-bottom border-4" style={{ borderColor: "#566873" }}>
                        <p className="small text-muted mb-0">Edad</p>
                        {/* Usamos el valor calculado que ya tienes o el del paciente */}
                        <h5 className="fw-bold mb-0">{p.edad || "--"} años</h5>
                    </div>
                </div>
            </div>

            <div className="row g-3 mb-4 text-center">
                <div className="col-md-4">
                    <div className={`p-3 rounded-4 bg-white shadow-sm border-bottom border-4 ${parseInt(editando ? formData.tension : p.tension) > 140 ? 'border-danger' : 'border-info'}`}>
                        <p className="small text-muted mb-0">Tensión Arterial</p>
                        <h5 className="fw-bold mb-0">
                            {editando ? (
                                <input name="tension" className="form-control form-control-sm text-center fw-bold"
                                    value={formData.tension || ""} onChange={handleInputChange} style={{ maxWidth: "100px", margin: "0 auto" }} />
                            ) : (
                                p.tension || "--"
                            )}
                        </h5>
                    </div>
                </div>
                <div className="col-md-4">
                    <div className={`p-3 rounded-4 bg-white shadow-sm border-bottom border-4 ${parseFloat(editando ? formData.glucosa : p.glucosa) > 180 ? 'border-danger mi-alerta-viva' : 'border-success'}`}>
                        <p className="small text-muted mb-0">Glucosa</p>
                        <h5 className="fw-bold mb-0">
                            {editando ? (
                                <input name="glucosa" type="number" className="form-control form-control-sm text-center fw-bold"
                                    value={formData.glucosa || ""} onChange={handleInputChange} style={{ maxWidth: "100px", margin: "0 auto" }} />
                            ) : (
                                `${p.glucosa || "--"} mg/dL`
                            )}
                        </h5>
                    </div>
                </div>
                <div className="col-md-4">
                    <div className={`p-3 rounded-4 bg-white shadow-sm border-bottom border-4 ${(editando ? formData.spo2 : p.spo2) < 94 && (editando ? formData.spo2 : p.spo2) > 0 ? 'border-warning' : 'border-primary'}`}>
                        <p className="small text-muted mb-0">Saturación O2</p>
                        <h5 className="fw-bold mb-0">
                            {editando ? (
                                <input name="spo2" type="number" className="form-control form-control-sm text-center fw-bold"
                                    value={formData.spo2 || ""} onChange={handleInputChange} style={{ maxWidth: "100px", margin: "0 auto" }} />
                            ) : (
                                `${p.spo2 || "--"}%`
                            )}
                        </h5>
                    </div>
                </div>
            </div>

            {/* 4. INFORMACIÓN DETALLADA */}
            <div className="row">
                {/* Lateral: Datos Personales */}
                <div className="col-lg-4 mb-4">
                    <div className="card border-0 shadow-sm h-100 rounded-4 overflow-hidden">
                        <div className="card-header py-3 text-white border-0" style={{ backgroundColor: "#566873" }}>
                            <i className="fas fa-id-card me-2"></i> Datos Personales
                        </div>
                        <div className="card-body bg-white">
                            <ul className="list-group list-group-flush">
                                <li className="list-group-item px-0 py-2 border-bottom">
                                    <span className="text-muted small d-block">DNI / NIE</span>
                                    {editando ? (
                                        <input name="dni" className="form-control form-control-sm fw-bold" value={formData.dni || ""} onChange={handleInputChange} />
                                    ) : (
                                        <span className="fw-bold">{p.dni}</span>
                                    )}
                                </li>
                                <li className="list-group-item px-0 py-3 border-bottom">
                                    <span className="text-muted small d-block">Email</span>
                                    {editando ? (
                                        <input name="email" className="form-control form-control-sm" value={formData.email || ""} onChange={handleInputChange} />
                                    ) : (
                                        <span className="fw-bold">{p.email}</span>
                                    )}
                                </li>
                                <li className="list-group-item px-0 py-3 border-bottom">
                                    <span className="text-muted small d-block">Teléfono</span>
                                    {editando ? (
                                        <input name="telefono" className="form-control form-control-sm" value={formData.telefono || ""} onChange={handleInputChange} />
                                    ) : (
                                        <span className="fw-bold" style={{ color: "#e8888c" }}>{p.telefono}</span>
                                    )}
                                </li>
                                <li className="list-group-item px-0 py-3 border-0">
                                    <span className="text-muted small d-block">Dirección</span>
                                    {editando ? (
                                        <input name="direccion" className="form-control form-control-sm mb-1" placeholder="Calle..." value={formData.direccion || ""} onChange={handleInputChange} />
                                    ) : (
                                        <span className="small fw-semibold">{p.direccion}, {p.ciudad}</span>
                                    )}
                                    {editando && <input name="ciudad" className="form-control form-control-sm" placeholder="Ciudad" value={formData.ciudad || ""} onChange={handleInputChange} />}
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Principal: Historial y Tratamiento */}
                <div className="col-lg-8">
                    <div className="row g-3">
                        <div className="col-md-6 mb-3">
                            <div className="card border-0 shadow-sm h-100 rounded-4" style={{ backgroundColor: alertasCriticas.length > 0 ? "#fff5f5" : "#ebf2f1", borderLeft: alertasCriticas.length > 0 ? "5px solid #dc3545" : "none" }}>
                                <div className="card-body">
                                    <h6 className="fw-bold mb-3" style={{ color: "#e8888c" }}><i className="fas fa-biohazard me-2"></i> Riesgos y Alergias</h6>
                                    <div className="d-flex flex-wrap gap-1">
                                        {alertasCriticas.length > 0 ? alertasCriticas.map((a, i) => (
                                            <span key={i} className="badge text-white p-2" style={{ backgroundColor: a.color, fontSize: '0.7rem' }} title={a.prot}><i className={`fas ${a.icon} me-1`}></i> {a.msg}</span>
                                        )) : <span className="text-muted fw-bold">Ninguna conocida</span>}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="col-md-6 mb-3">
                            <div className="card border-0 shadow-sm h-100 rounded-4" style={{ backgroundColor: "#b4d2d9" }}>
                                <div className="card-body text-center d-flex flex-column justify-content-center">
                                    <h6 className="fw-bold mb-1" style={{ color: "#566873" }}>Grupo Sanguíneo</h6>
                                    {editando ? (
                                        <select name="grupoSanguineo" className="form-select form-select-lg fw-bold text-center mx-auto" style={{ maxWidth: "120px", color: "#566873" }} value={formData.grupoSanguineo || ""} onChange={handleInputChange}>
                                            <option value="">--</option>
                                            <option value="A+">A+</option>
                                            <option value="A-">A-</option>
                                            <option value="B+">B+</option>
                                            <option value="B-">B-</option>
                                            <option value="O+">O+</option>
                                            <option value="O-">O-</option>
                                            <option value="AB+">AB+</option>
                                            <option value="AB-">AB-</option>
                                        </select>
                                    ) : (
                                        <h2 className="mb-0 fw-black display-5" style={{ color: "#566873" }}>{p.grupoSanguineo || "--"}</h2>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="col-12 mb-3">
                            <div className="card border-0 shadow-sm rounded-4">
                                <div className="card-header py-3 text-white border-0 d-flex justify-content-between align-items-center" style={{ backgroundColor: "#93bbbf" }}>
                                    <h6 className="mb-0 fw-bold"><i className="fas fa-history me-2"></i> ANTECEDENTES MÉDICOS</h6>
                                    {!editando && (
                                        <button className="btn btn-sm btn-light text-dark fw-bold rounded-pill px-3 d-print-none shadow-sm" onClick={() => setEditando(true)}>
                                            <i className="fas fa-edit me-1"></i> Editar
                                        </button>
                                    )}
                                </div>
                                <div className="card-body bg-white p-4">
                                    <div className="p-3 rounded-3 bg-light" style={{ minHeight: "100px", borderLeft: "4px solid #93bbbf" }}>
                                        {editando ? (
                                            <textarea
                                                name="antecedentes"
                                                className="form-control border-0 bg-transparent text-secondary"
                                                rows="4"
                                                style={{ lineHeight: "1.6" }}
                                                value={formData.antecedentes || ""}
                                                onChange={handleInputChange}
                                                placeholder="Escriba los antecedentes aquí..."
                                            />
                                        ) : (
                                            <p className="text-secondary mb-0" style={{ lineHeight: "1.6", whiteSpace: "pre-line" }}>
                                                {p.antecedentes || "Sin antecedentes registrados."}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* PLAN DE TRATAMIENTO */}
                        <div className="col-12 mb-3">
                            <div className="card border-0 shadow-sm rounded-4 overflow-hidden border-start border-5" style={{ borderColor: "#5e888c" }}>
                                <div className="card-header py-3 text-white border-0 d-flex justify-content-between align-items-center" style={{ backgroundColor: "#5e888c" }}>
                                    <h6 className="mb-0 fw-bold"><i className="fas fa-prescription me-2"></i> PLAN DE TRATAMIENTO (RECETA)</h6>
                                    {editando && <span className="badge bg-white text-dark">Modo Edición</span>}
                                </div>
                                <div className="card-body bg-white p-4">
                                    {editando ? (
                                        <textarea
                                            name="anotaciones"
                                            className="form-control border-0 bg-light p-3 fw-bold"
                                            style={{ color: "#566873", fontSize: "1.1rem", minHeight: "120px" }}
                                            value={formData.anotaciones || ""}
                                            onChange={handleInputChange}
                                            placeholder="Escriba la prescripción aquí..."
                                        />
                                    ) : (
                                        <div className="p-3 bg-light rounded-3" style={{ minHeight: "120px" }}>
                                            <p className="fw-bold mb-0" style={{ color: "#566873", fontSize: "1.1rem", whiteSpace: "pre-line" }}>
                                                {p.anotaciones || "Sin prescripción actual."}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* BOTONES DE ACCIÓN PRINCIPALES */}
                        <div className="container d-print-none mt-5 mb-5">
                            <div className="d-flex flex-wrap gap-3 justify-content-center align-items-center p-4 rounded-4 bg-white shadow-sm border">

                                {!editando ? (
                                    <>
                                        <button
                                            className="btn btn-sm shadow-sm text-white px-3 d-flex align-items-center"
                                            style={{ backgroundColor: "#93bbbf", borderRadius: "8px", height: "38px", border: "none", fontSize: "0.9rem" }}
                                            onClick={() => navigate("/healthform", { state: { pacienteAEditar: p } })}
                                        >
                                            <i className="fas fa-edit me-2"></i> Editar
                                        </button>

                                        <button
                                            className="btn btn-sm shadow-sm text-white px-3 d-flex align-items-center"
                                            style={{ backgroundColor: "#566873", borderRadius: "8px", height: "38px", border: "none", fontSize: "0.9rem" }}
                                            onClick={() => window.print()}
                                        >
                                            <i className="fas fa-print me-2"></i> Informe
                                        </button>

                                        <button
                                            className="btn btn-sm btn-outline-danger shadow-sm px-3 d-flex align-items-center"
                                            style={{ borderRadius: "8px", height: "38px", fontSize: "0.9rem", borderWidth: "1px" }}
                                            onClick={() => handleEliminarDesdeFicha(p.id)}
                                        >
                                            <i className="fas fa-trash-alt me-2"></i> Eliminar
                                        </button>

                                        <button
                                            className="btn btn-sm shadow-sm text-white px-3 d-flex align-items-center"
                                            style={{ backgroundColor: "#e8888c", borderRadius: "8px", height: "38px", border: "none", fontSize: "0.9rem" }}
                                            onClick={() => navigate("/areapersonal", { state: { pacienteId: p.id, nombre: p.nombre } })}
                                        >
                                            <i className="fas fa-calendar-plus me-2"></i> Nueva Consulta
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button className="btn btn-success shadow-sm px-5 fw-bold" style={{ borderRadius: "50px", height: "50px" }} onClick={handleGuardarCambios}>
                                            GUARDAR CAMBIOS
                                        </button>
                                        <button className="btn btn-light shadow-sm px-5 fw-bold ms-2" style={{ borderRadius: "50px", height: "50px", border: "1px solid #ddd" }} onClick={() => setEditando(false)}>
                                            CANCELAR
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* FIRMA (Solo para impresión) */}
                        <div className="d-none d-print-block w-100 mt-5">
                            <div className="d-flex justify-content-end">
                                <div className="text-center" style={{ width: "300px" }}>
                                    <div style={{ borderTop: "2px solid #000", marginBottom: "8px" }}></div>
                                    <p className="fw-bold mb-0">Firma y Sello del Facultativo</p>
                                    <p className="small">Fecha: {new Date().toLocaleDateString()}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};