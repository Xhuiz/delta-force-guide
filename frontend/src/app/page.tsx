import Link from "next/link";

const FEATURES = [
  {
    href: "/map",
    icon: "🗺️",
    title: "交互式地图",
    desc: "标注点筛选、战术路线、资源分布一目了然",
  },
  {
    href: "/guides",
    icon: "📖",
    title: "深度攻略",
    desc: "地图攻略、配装推荐、新手入门全覆盖",
  },
  {
    href: "/loadout",
    icon: "🔧",
    title: "配装模拟器",
    desc: "3D 武器预览、配件搭配、属性实时计算",
  },
];

export default function Home() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white">
        <div className="max-w-5xl mx-auto px-4 py-20 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">三角洲地图攻略</h1>
          <p className="text-lg sm:text-xl text-blue-100 mb-8">
            交互式地图 · 深度攻略 · 配装模拟
          </p>
          <Link
            href="/map"
            className="inline-block px-8 py-3 bg-white text-blue-700 font-semibold rounded-lg hover:bg-blue-50 transition-colors"
          >
            立即探索地图
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-4 py-16 w-full">
        <h2 className="text-2xl font-bold text-center mb-10 text-gray-800">核心功能</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {FEATURES.map((f) => (
            <Link
              key={f.href}
              href={f.href}
              className="block p-6 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all"
            >
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">{f.title}</h3>
              <p className="text-sm text-gray-500">{f.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-white py-6 text-center text-sm text-gray-400">
        三角洲地图攻略 — 非官方社区项目
      </footer>
    </div>
  );
}
