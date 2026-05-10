export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="text-4xl font-bold">三角洲地图攻略</h1>
      <p className="mt-4 text-lg text-gray-600">交互式地图 · 深度攻略 · 配装模拟</p>
      <a
        href="/map"
        className="mt-6 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
      >
        进入地图
      </a>
    </main>
  );
}
