import { useParams, useNavigate } from "react-router-dom";
import { useEffect } from "react";

export default function IssueDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const issueId = Number(id);

  useEffect(() => {
    if (issueId && !isNaN(issueId)) {
      navigate("/", {
        state: {
          openIssueId: issueId,
        },
        replace: true,
      });
    } else {
      navigate("/", { replace: true });
    }
  }, [issueId, navigate]);

  return null;
}
