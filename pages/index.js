import Head from "next/head";
import MedicalLesson from "../components/MedicalLesson";


export default function Home() {
  return (
    <div className="p-0 md:p-6 min-h-screen bg-gray-100 flex flex-col items-center" style={{ backgroundImage:"url('/116808.jpg')", backgroundSize: "cover", backgroundPosition:"top" }}>
      <Head>
        <title>WriteMaestro</title>
        <meta name="description" content="Interactive English Writing training" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="w-full max-w-2xl p-6 bg-white sm:shadow-md sm:rounded-lg">
        <img src="/logo.png" alt="WriteMaestro" className="mx-auto logo" />
        <MedicalLesson />
      </main>
    </div>
  );
}
