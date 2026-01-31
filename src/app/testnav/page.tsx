import SidebarStack from "@/components/navigation/SidebarStack";

export default function TestNavPage() {
  return (
    <div className="fixed inset-0 flex">
      <SidebarStack />
      <div className="flex-1 bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Map View</h1>
          <p className="text-gray-600">Select a signal to see sightings</p>
        </div>
      </div>
    </div>
  );
}
