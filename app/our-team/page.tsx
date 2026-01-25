"use client";

import Image from "next/image";

export default function OurTeamPage() {
  const team = [
    {
      name: "Ahnaf Chowdhury",
      role: "Extension Lead Developer",
      bio: "https://www.linkedin.com/in/ahnafmchowdhury/",
      image: "/Ahnaf.png"
    },
    {
      name: "Shawn Vazhappilly",
      role: "Extension Integrator",
      bio: "https://www.linkedin.com/in/shawn-vazhappilly-946436196/",
      image: "/shawn.png"
    },
    {
      name: "Liam Gale",
      role: "Web Integration & Mapping Specialist",
      bio: "https://www.linkedin.com/in/liam-gale-343778361/",
      image: "/liam.jpg"
    },
    {
      name: "Ariella Efraim",
      role: "UI Designer",
      bio: "www.linkedin.com/in/ariella-efraim-633285369",
      image: "/ariella.jpg"
    }
  ];

  return (
    <main className="flex flex-col min-h-screen bg-white pt-8 pb-16">
      <div className="w-full max-w-7xl mx-auto px-4 md:px-8">
        <h1 className="text-5xl md:text-6xl font-bold mb-4 text-emerald-900">Our Team</h1>
        <p className="text-lg text-emerald-600 mb-12">Meet the talented people behind GatorGreen</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {team.map((member, index) => (
            <div key={index} className="bg-white rounded-2xl shadow-lg p-8 text-center">
              <div className="w-32 h-32 mx-auto mb-4 mt-2 bg-emerald-100 rounded-full flex items-center justify-center overflow-hidden relative">
                {member.image ? (
                  <Image
                    src={member.image}
                    alt={member.name}
                    fill
                    className="object-cover"
                    style={{ 
                      objectPosition: member.name === "Ariella Efraim" ? '80% 35%' : member.name === "Ahnaf Chowdhury" ? '70% 30%' : 'center',
                      transform: member.name === "Liam Gale" ? 'scale(1.5)' : member.name === "Shawn Vazhappilly" ? 'scale(1.5)' : member.name === "Ahnaf Chowdhury" ? 'scale(1.3)' : 'none'
                    }}
                  />
                ) : (
                  <span className="text-emerald-600 text-3xl font-bold">{member.name.charAt(0)}</span>
                )}
              </div>
              <h2 className="text-2xl font-bold text-emerald-900 mb-2">{member.name}</h2>
              <p className="text-emerald-600 font-semibold mb-4">{member.role}</p>
              {(member.name === "Ariella Efraim" || member.name === "Liam Gale" || member.name === "Ahnaf Chowdhury" || member.name === "Shawn Vazhappilly") ? (
                <a href={member.name === "Ariella Efraim" ? `https://${member.bio}` : member.bio} target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-gray-700 text-xl font-bold bg-gray-200 px-5 py-2 rounded-full inline-block">
                  LinkedIn
                </a>
              ) : (
                <p className="text-gray-700">{member.bio}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
