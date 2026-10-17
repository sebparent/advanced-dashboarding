"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import * as XLSX from "xlsx";
import {
  OPERATIONS,
  DEFAULT_FIELD_CATALOG,
  buildMapping,
  buildOutputJson,
  extractFieldNames,
} from "@/lib/spacefillFields";

export default function Home() {
  const [step, setStep] = useState(1);
  const [fieldCatalog, setFieldCatalog] = useState(DEFAULT_FIELD_CATALOG);

  useEffect(() => {
    fetch("/api/spacefill-schema")
      .then((res) => res.json())
      .then((data) => {
        if (data.configured && data.fieldCatalog?.length > 0) {
          setFieldCatalog(data.fieldCatalog);
        }
      })
      .catch(() => {});
  }, []);

  const [operations, setOperations] = useState([]);
  const [fileName, setFileName] = useState("");
  const [mapping, setMapping] = useState([]);
  const [error, setError] = useState("");
  const [outputJson, setOutputJson] = useState("");
  const [copied, setCopied] = useState(false);

  function toggleOperation(key) {
    setOperations((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  async function handleFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError("");
    setOutputJson("");
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
      const { fieldNames } = extractFieldNames(rows);

      if (fieldNames.length === 0) {
        setError("Je n'ai trouvé aucun champ à mapper dans ce fichier.");
        return;
      }

      setFileName(file.name);
      setMapping(buildMapping(fieldNames, fieldCatalog));
      setStep(3);
    } catch (err) {
      setError("Ce fichier n'a pas pu être lu. Vérifiez qu'il s'agit bien d'un fichier Excel.");
    }
  }

  function updateMappingField(index, field) {
    setMapping((prev) =>
      prev.map((row, i) => (i === index ? { ...row, field } : row))
    );
    setOutputJson("");
  }

  function updateMappingType(index, type) {
    setMapping((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row;
        if (type === "custom") {
          const alreadyCustom = row.type === "custom" ? row.field : null;
          return { ...row, type, field: alreadyCustom || row.column.toLowerCase().replace(/[^a-z0-9]+/g, "_") };
        }
        return { ...row, type, field: fieldCatalog[0].field };
      })
    );
    setOutputJson("");
  }

  function generateJson() {
    setOutputJson(JSON.stringify(buildOutputJson(operations, mapping), null, 2));
    setCopied(false);
  }

  async function copyJson() {
    try {
      await navigator.clipboard.writeText(outputJson);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      setError("La copie automatique n'a pas fonctionné, sélectionnez le texte manuellement.");
    }
  }

  function downloadJson() {
    const blob = new Blob([outputJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "mapping-spacefill.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  function startOver() {
    setStep(1);
    setOperations([]);
    setFileName("");
    setMapping([]);
    setOutputJson("");
    setError("");
  }

  return (
    <main className="wizard">
      <header className="wizard-header">
        <Image
          className="wizard-logo"
          src="/spacefill-logo.png"
          alt="Spacefill"
          width={140}
          height={79}
          priority
        />
        <p className="tag">Connecteurs</p>
        <h1>Préparer un mapping de champs</h1>
        <p className="lead">
          Donnez un fichier Excel, on détecte automatiquement les champs
          Spacefill et on prépare le JSON prêt à l&rsquo;emploi pour votre
          connecteur.
        </p>
      </header>

      <ol className="steps">
        <li className={step === 1 ? "active" : step > 1 ? "done" : ""}>1. Besoin</li>
        <li className={step === 2 ? "active" : step > 2 ? "done" : ""}>2. Fichier</li>
        <li className={step === 3 ? "active" : ""}>3. Mapping</li>
      </ol>

      {step === 1 && (
        <section className="card">
          <h2>De quoi avez-vous besoin ?</h2>
          <p className="muted">Cochez tout ce qui s&rsquo;applique à votre connecteur.</p>
          <div className="options">
            {OPERATIONS.map((op) => (
              <label key={op.key} className="option">
                <input
                  type="checkbox"
                  checked={operations.includes(op.key)}
                  onChange={() => toggleOperation(op.key)}
                />
                {op.label}
              </label>
            ))}
          </div>
          <button
            className="btn-primary"
            disabled={operations.length === 0}
            onClick={() => setStep(2)}
          >
            Continuer
          </button>
        </section>
      )}

      {step === 2 && (
        <section className="card">
          <h2>Donnez votre fichier Excel</h2>
          <p className="muted">
            La première ligne du fichier doit contenir les noms des colonnes.
          </p>
          <label className="dropzone">
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFile}
              hidden
            />
            Choisir un fichier
          </label>
          {error && <p className="error">{error}</p>}
          <button className="btn-secondary" onClick={() => setStep(1)}>
            Retour
          </button>
        </section>
      )}

      {step === 3 && (
        <section className="card wide">
          <h2>Vérifiez le mapping détecté</h2>
          <p className="muted">
            Fichier : <strong>{fileName}</strong>. Ajustez une correspondance si
            besoin, puis générez le JSON.
          </p>

          <table className="mapping-table">
            <thead>
              <tr>
                <th>Champ détecté dans le fichier</th>
                <th>Type</th>
                <th>Champ Spacefill</th>
              </tr>
            </thead>
            <tbody>
              {mapping.map((row, index) => (
                <tr key={`${row.column}-${index}`}>
                  <td>{row.column}</td>
                  <td>
                    <select
                      value={row.type}
                      onChange={(e) => updateMappingType(index, e.target.value)}
                    >
                      <option value="standard">Champ standard</option>
                      <option value="custom">Champ personnalisé</option>
                    </select>
                  </td>
                  <td>
                    {row.type === "standard" ? (
                      <select
                        value={row.field}
                        onChange={(e) => updateMappingField(index, e.target.value)}
                      >
                        {fieldCatalog.map((entry) => (
                          <option key={entry.field} value={entry.field}>
                            {entry.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="custom-field">
                        custom_fields.
                        <input
                          value={row.field}
                          onChange={(e) => updateMappingField(index, e.target.value)}
                        />
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="actions">
            <button className="btn-secondary" onClick={startOver}>
              Recommencer
            </button>
            <button className="btn-primary" onClick={generateJson}>
              Générer le JSON
            </button>
          </div>

          {outputJson && (
            <div className="output">
              <pre>{outputJson}</pre>
              <div className="actions">
                <button className="btn-secondary" onClick={copyJson}>
                  {copied ? "Copié !" : "Copier"}
                </button>
                <button className="btn-primary" onClick={downloadJson}>
                  Télécharger
                </button>
              </div>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
