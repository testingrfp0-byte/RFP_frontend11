import Home from "../pages/Home";

export default function SelfAssignView(props) {
  return (
    <Home
      selfAssignMode={true}
      {...props}
    />
  );
}