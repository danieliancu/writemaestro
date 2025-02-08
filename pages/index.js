import Head from "next/head";
import MedicalLesson from "../components/MedicalLesson";


export default function Home() {
  return (
    <div className="p-0 md:p-6 min-h-screen bg-gray-100 flex flex-col items-center" style={{ backgroundImage:"url('https://img.freepik.com/free-photo/students-making-thumbs-up-break_23-2147679177.jpg?t=st=1739027863~exp=1739031463~hmac=7d69af6c0907cbbbff90277356d90e9f888dd07086d45aa480b0de247ce5a939&w=1380')", backgroundSize: "cover", backgroundPosition:"top" }}>
      <Head>
        <title>WriteMaestro</title>
        <meta name="description" content="Interactive English training for medical professionals" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="w-full max-w-2xl p-6 bg-white sm:shadow-md sm:rounded-lg">
        <MedicalLesson />
      </main>
    </div>
  );
}
