import Link from "next/link";
import { DeleteProjectButton } from "@/components/DeleteProjectButton";

interface ProjectListCardProps {
  projectId: string;
  projectName: string;
  children: React.ReactNode;
}

export function ProjectListCard({
  projectId,
  projectName,
  children,
}: ProjectListCardProps) {
  return (
    <div className="card relative transition-shadow hover:shadow-md">
      <DeleteProjectButton
        projectId={projectId}
        projectName={projectName}
        className="absolute right-4 top-4 z-10"
      />
      <Link href={`/studio/${projectId}`} className="block pr-14">
        {children}
      </Link>
    </div>
  );
}
