import Image from "next/image";

export default function Home() {
  return (
    <main className="empty">
      <Image
        className="logo"
        src="/spacefill-logo.png"
        alt="Spacefill"
        width={300}
        height={169}
        priority
      />

      <p className="tag">Bootcamp</p>

      <h1>Ta toile est vide</h1>
      <p className="lead">
        Décris ton idée à Claude Code, et elle apparaîtra ici même.
      </p>

      <p className="example">
        Essaie&nbsp;: «&nbsp;Construis-moi un mini outil de suivi clients.&nbsp;»
      </p>

      <p className="hint">
        Pas besoin de coder — explique simplement ce que tu veux, avec tes mots.
      </p>
    </main>
  );
}
