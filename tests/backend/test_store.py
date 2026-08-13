"""Tests for the job store: retrieval, updates, and eviction."""

from backend.models import DownloadState


class TestBasicOperations:
    def test_should_return_stored_job_by_id(self, store, make_job):
        job = make_job("a")
        store.add(job)
        assert store.get("a") == job

    def test_should_return_none_for_unknown_id(self, store):
        assert store.get("missing") is None

    def test_should_list_jobs_newest_first(self, store, make_job):
        store.add(make_job("a"))
        store.add(make_job("b"))
        assert [j.id for j in store.list_all()] == ["b", "a"]

    def test_should_start_empty(self, store):
        assert store.list_all() == []


class TestUpdates:
    def test_should_apply_field_updates(self, store, make_job):
        store.add(make_job("a"))
        store.update("a", status=DownloadState.COMPLETED, title="Song")

        job = store.get("a")
        assert job.status == DownloadState.COMPLETED
        assert job.title == "Song"

    def test_should_leave_other_fields_untouched(self, store, make_job):
        store.add(make_job("a", url="https://youtu.be/dQw4w9WgXcQ"))
        store.update("a", title="Song")
        assert store.get("a").url == "https://youtu.be/dQw4w9WgXcQ"

    def test_should_ignore_updates_to_evicted_jobs(self, store, make_job):
        """A background task may outlive its job; that must not raise."""
        store.update("never-existed", status=DownloadState.COMPLETED)


class TestEviction:
    def test_should_keep_jobs_within_the_cap(self, store, make_job):
        for i in range(3):
            store.add(make_job(f"job-{i}"))
        assert len(store.list_all()) == 3

    def test_should_evict_oldest_finished_job_when_full(self, store, make_job):
        for i in range(3):
            store.add(make_job(f"job-{i}", status=DownloadState.COMPLETED))
        store.add(make_job("job-3"))

        ids = {j.id for j in store.list_all()}
        assert len(ids) == 3
        assert "job-0" not in ids
        assert "job-3" in ids

    def test_should_never_evict_an_active_job(self, store, make_job):
        """Evicting a job still being written to would lose its result."""
        for i in range(3):
            store.add(make_job(f"active-{i}", status=DownloadState.DOWNLOADING))
        store.add(make_job("new"))

        ids = {j.id for j in store.list_all()}
        assert ids == {"active-0", "active-1", "active-2", "new"}

    def test_should_prefer_evicting_finished_jobs_over_active_ones(
        self, store, make_job
    ):
        store.add(make_job("active", status=DownloadState.DOWNLOADING))
        store.add(make_job("done", status=DownloadState.COMPLETED))
        store.add(make_job("failed", status=DownloadState.FAILED))
        store.add(make_job("new"))

        ids = {j.id for j in store.list_all()}
        assert "active" in ids
        assert "done" not in ids
